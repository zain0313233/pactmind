import bcrypt from 'bcryptjs'
import { signAccessToken } from '@/lib/auth'
import { userRepository } from '@/repositories/user.repository'
import { otpService } from '@/services/otp.service'
import { SignupInput, LoginInput } from '@/validators/auth.schema'

function toPublicUser(user: {
  id: string
  name: string | null
  email: string
  role: string
  emailVerified: boolean
  accessRestricted?: boolean
  unblockRequestPending?: boolean
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    accessRestricted: user.accessRestricted ?? false,
    unblockRequestPending: user.unblockRequestPending ?? false,
  }
}

function skipEmailVerification(): boolean {
  // Only skip during Playwright E2E (injected by playwright.config webServer env)
  return process.env.PLAYWRIGHT_SKIP_EMAIL_VERIFY === '1'
}

export const userService = {
  signup: async (input: SignupInput) => {
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw new Error(
        'An account with this email already exists. Sign in or verify your email.'
      )
    }

    const hashedPassword = await bcrypt.hash(input.password, 10)
    const verifyNow = skipEmailVerification()

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      emailVerified: verifyNow,
    })

    if (!verifyNow) {
      await otpService.sendCode(user.email, 'verify_email')
    }

    const token = signAccessToken(user.id, user.tokenVersion)

    return {
      user: toPublicUser(user),
      token,
    }
  },

  login: async (input: LoginInput) => {
    const user = await userRepository.findByEmail(input.email)
    if (!user) throw new Error('Invalid email or password')

    const isValid = await bcrypt.compare(input.password, user.password)
    if (!isValid) throw new Error('Invalid email or password')

    const token = signAccessToken(user.id, user.tokenVersion)

    return {
      user: toPublicUser(user),
      token,
    }
  },

  logout: async (userId: string) => {
    await userRepository.incrementTokenVersion(userId)
  },
}
