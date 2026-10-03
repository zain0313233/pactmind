import dns from 'node:dns'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { Resend } from 'resend'

export type OtpEmailPurpose = 'verify_email' | 'reset_password'

const IPV4_HOST_RE = /^\d{1,3}(\.\d{1,3}){3}$/

let resendClient: Resend | null = null

function useResendApi(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

let smtpTransporter: Transporter | null = null
let smtpTransporterPromise: Promise<Transporter> | null = null

function smtpConfig() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured')
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }
}

function resolveSmtpIpv4(hostname: string): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses.length > 0) {
        resolve(addresses[0])
        return
      }
      dns.lookup(hostname, { family: 4 }, (lookupErr, address) => {
        if (lookupErr) reject(lookupErr)
        else resolve(address)
      })
    })
  })
}

/**
 * Nodemailer prefers dns.resolve6() when resolve4 fails; Railway has no IPv6 egress.
 * Resolve SMTP to IPv4 ourselves and connect by IP with TLS servername for SNI.
 */
async function getSmtpTransporter(): Promise<Transporter> {
  if (smtpTransporter) return smtpTransporter
  if (!smtpTransporterPromise) {
    smtpTransporterPromise = (async () => {
      const config = smtpConfig()
      const hostname = config.host
      let connectHost = hostname

      if (!IPV4_HOST_RE.test(hostname)) {
        try {
          connectHost = await resolveSmtpIpv4(hostname)
        } catch (error) {
          console.warn(
            `[email] Failed to resolve ${hostname} to IPv4:`,
            error instanceof Error ? error.message : error
          )
        }
      }

      const transportOptions: SMTPTransport.Options = {
        host: connectHost,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        connectionTimeout: config.connectionTimeout,
        greetingTimeout: config.greetingTimeout,
        socketTimeout: config.socketTimeout,
        tls: { servername: hostname },
      }
      smtpTransporter = nodemailer.createTransport(transportOptions)
      return smtpTransporter
    })()
  }
  return smtpTransporterPromise
}

function fromAddress(): string {
  const email =
    process.env.RESEND_FROM_EMAIL ??
    process.env.SMTP_FROM_EMAIL ??
    process.env.SMTP_USER
  const name = process.env.SMTP_FROM_NAME ?? 'PactMind'
  if (!email) throw new Error('Email sender address is not configured')
  return `"${name}" <${email}>`
}

type OutboundEmail = {
  to: string
  subject: string
  text: string
  html: string
}

async function sendViaResend(message: OutboundEmail): Promise<void> {
  const { error } = await getResendClient().emails.send({
    from: fromAddress(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function sendViaSmtp(message: OutboundEmail): Promise<void> {
  const transporter = await getSmtpTransporter()
  await transporter.sendMail({
    from: fromAddress(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
}

async function sendEmail(message: OutboundEmail): Promise<void> {
  if (useResendApi()) {
    await sendViaResend(message)
    return
  }
  await sendViaSmtp(message)
}

function purposeCopy(purpose: OtpEmailPurpose) {
  if (purpose === 'verify_email') {
    return {
      subject: 'Verify your PactMind email',
      title: 'Verify your email',
      body: 'Use this code to verify your PactMind account:',
    }
  }

  return {
    subject: 'Reset your PactMind password',
    title: 'Password reset',
    body: 'Use this code to reset your PactMind password:',
  }
}

export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: OtpEmailPurpose
): Promise<void> {
  if (process.env.PLAYWRIGHT_TEST === '1') {
    console.info(`[email:otp] ${purpose} → ${to}: ${code}`)
    return
  }

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (
    !useResendApi() &&
    (!host || !user || !pass) &&
    process.env.NODE_ENV === 'development'
  ) {
    console.info(`[email:otp] ${purpose} → ${to}: ${code} (email not configured)`)
    return
  }

  const copy = purposeCopy(purpose)

  await sendEmail({
    to,
    subject: copy.subject,
    text: `${copy.body} ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Inter,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;margin:0 0 12px;">${copy.title}</h2>
        <p style="color:#475569;margin:0 0 20px;">${copy.body}</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0F172A;background:#f1f5f9;border-radius:12px;padding:16px 24px;text-align:center;">
          ${code}
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Expires in 10 minutes. Do not share this code.</p>
      </div>
    `,
  })
}

export async function sendPasswordChangedEmail(to: string): Promise<void> {
  if (process.env.PLAYWRIGHT_TEST === '1') return

  await sendEmail({
    to,
    subject: 'Your PactMind password was changed',
    text: 'Your PactMind password was changed successfully. If this was not you, contact support immediately.',
    html: `
      <div style="font-family:Inter,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">Password updated</h2>
        <p style="color:#475569;">Your PactMind password was changed successfully.</p>
        <p style="color:#94a3b8;font-size:13px;">If this was not you, reset your password immediately.</p>
      </div>
    `,
  })
}

function adminPortalUrl(path: string): string {
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}${path}`
}

function adminEmailShell(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:Inter,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#0F172A;margin:0 0 12px;">${title}</h2>
      ${bodyHtml}
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">PactMind Platform Admin</p>
    </div>
  `
}

export async function sendAdminUnblockRequestEmail(data: {
  adminEmail: string
  userEmail: string
  userName: string | null
  requestedAt: string
}): Promise<void> {
  if (process.env.PLAYWRIGHT_TEST === '1') {
    console.info(`[email:admin-unblock] → ${data.adminEmail}: ${data.userEmail}`)
    return
  }

  const reviewUrl = adminPortalUrl('/admin/users?needsAction=1')

  await sendEmail({
    to: data.adminEmail,
    subject: `[PactMind] Unblock request — ${data.userEmail}`,
    text: `${data.userName ?? data.userEmail} requested portal access restoration. Review: ${reviewUrl}`,
    html: adminEmailShell(
      'Unblock request pending',
      `<p style="color:#475569;"><strong>${data.userName ?? 'User'}</strong> (${data.userEmail}) requested admin review to restore portal access.</p>
       <p style="color:#475569;">Requested: ${new Date(data.requestedAt).toLocaleString()}</p>
       <p style="margin-top:20px;"><a href="${reviewUrl}" style="background:#14b8a6;color:#042f2e;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Review in admin panel</a></p>`
    ),
  })
}

export async function sendAccessRestrictedEmail(to: string, maxStrikes: number): Promise<void> {
  if (process.env.PLAYWRIGHT_TEST === '1') return

  await sendEmail({
    to,
    subject: 'PactMind access temporarily restricted',
    text: `Your PactMind portal access was restricted after ${maxStrikes} consecutive off-topic PactMind messages. Log in and use "Request unblock" for admin review.`,
    html: adminEmailShell(
      'Access restricted',
      `<p style="color:#475569;">Your portal access was temporarily restricted after repeated off-topic PactMind usage.</p>
       <p style="color:#475569;">Sign in and submit an unblock request — an admin will review it.</p>`
    ),
  })
}

export async function sendAccessRestoredEmail(to: string): Promise<void> {
  if (process.env.PLAYWRIGHT_TEST === '1') return

  await sendEmail({
    to,
    subject: 'PactMind access restored',
    text: 'Your PactMind portal access has been restored. Please use PactMind for contract-related questions only.',
    html: adminEmailShell(
      'Access restored',
      `<p style="color:#475569;">Your portal access has been restored by an admin.</p>
       <p style="color:#475569;">Please use PactMind only for questions about your uploaded contracts.</p>`
    ),
  })
}
