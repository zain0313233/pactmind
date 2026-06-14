import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { sendOtpEmail, sendPasswordChangedEmail } from '@/lib/email'
import { otpRepository, type OtpPurpose } from '@/repositories/otp.repository'
import { userRepository } from '@/repositories/user.repository'

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_HOUR = 3

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000))
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const otpService = {
  async sendCode(
    email: string,
    purpose: OtpPurpose,
    options?: { awaitEmail?: boolean }
  ): Promise<void> {
    const normalized = normalizeEmail(email)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const recentSends = await otpRepository.countRecentSends(
      normalized,
      purpose,
      oneHourAgo
    )
    if (recentSends >= MAX_SENDS_PER_HOUR) {
      throw new Error('Too many codes sent. Please try again later.')
    }

    void otpRepository.purgeExpired().catch((error) => {
      console.warn('[otp] purgeExpired failed:', error instanceof Error ? error.message : error)
    })
    await otpRepository.deleteForEmail(normalized, purpose)

    const code = generateOtpCode()
    const codeHash = await bcrypt.hash(code, 10)

    await otpRepository.create({
      email: normalized,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    })

    const deliverEmail = async () => {
      try {
        await sendOtpEmail(normalized, code, purpose)
      } catch (error) {
        console.warn(
          `[otp] Email delivery failed for ${purpose} → ${normalized}:`,
          error instanceof Error ? error.message : error
        )
        if (process.env.NODE_ENV === 'development') {
          console.info(`[dev:otp] ${purpose} for ${normalized}: ${code}`)
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.info(`[dev:otp] ${purpose} for ${normalized}: ${code}`)
      }
    }

    if (options?.awaitEmail === false) {
      void deliverEmail()
      return
    }

    await deliverEmail()
  },

  async verifyCode(
    email: string,
    purpose: OtpPurpose,
    code: string
  ): Promise<void> {
    const normalized = normalizeEmail(email)
    const record = await otpRepository.findLatest(normalized, purpose)

    if (!record) {
      throw new Error('Invalid or expired code')
    }

    if (record.expiresAt < new Date()) {
      await otpRepository.deleteById(record.id)
      throw new Error('Invalid or expired code')
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await otpRepository.deleteById(record.id)
      throw new Error('Too many attempts. Request a new code.')
    }

    const valid = await bcrypt.compare(code, record.codeHash)
    if (!valid) {
      await otpRepository.incrementAttempts(record.id)
      throw new Error('Invalid or expired code')
    }

    await otpRepository.deleteById(record.id)
  },

  async verifyEmail(email: string, code: string) {
    const normalized = normalizeEmail(email)
    await this.verifyCode(normalized, 'verify_email', code)
    await userRepository.markEmailVerified(normalized)
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalized = normalizeEmail(email)
    const user = await userRepository.findByEmail(normalized)
    if (!user) {
      throw new Error('Invalid or expired code')
    }

    await this.verifyCode(normalized, 'reset_password', code)

    const hashed = await bcrypt.hash(newPassword, 10)
    await userRepository.updatePassword(user.id, hashed)
    await userRepository.incrementTokenVersion(user.id)
    await sendPasswordChangedEmail(normalized)
  },
}
