import nodemailer from 'nodemailer'

export type OtpEmailPurpose = 'verify_email' | 'reset_password'

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

function fromAddress(): string {
  const email = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER
  const name = process.env.SMTP_FROM_NAME ?? 'ClauseIQ'
  return `"${name}" <${email}>`
}

function purposeCopy(purpose: OtpEmailPurpose) {
  if (purpose === 'verify_email') {
    return {
      subject: 'Verify your ClauseIQ email',
      title: 'Verify your email',
      body: 'Use this code to verify your ClauseIQ account:',
    }
  }

  return {
    subject: 'Reset your ClauseIQ password',
    title: 'Password reset',
    body: 'Use this code to reset your ClauseIQ password:',
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
  if ((!host || !user || !pass) && process.env.NODE_ENV === 'development') {
    console.info(`[email:otp] ${purpose} → ${to}: ${code} (SMTP not configured)`)
    return
  }

  const copy = purposeCopy(purpose)
  const transporter = nodemailer.createTransport(smtpConfig())

  await transporter.sendMail({
    from: fromAddress(),
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

  const transporter = nodemailer.createTransport(smtpConfig())

  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: 'Your ClauseIQ password was changed',
    text: 'Your ClauseIQ password was changed successfully. If this was not you, contact support immediately.',
    html: `
      <div style="font-family:Inter,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">Password updated</h2>
        <p style="color:#475569;">Your ClauseIQ password was changed successfully.</p>
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
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">ClauseIQ Platform Admin</p>
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

  const transporter = nodemailer.createTransport(smtpConfig())
  const reviewUrl = adminPortalUrl('/admin/users?needsAction=1')

  await transporter.sendMail({
    from: fromAddress(),
    to: data.adminEmail,
    subject: `[ClauseIQ] Unblock request — ${data.userEmail}`,
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

  const transporter = nodemailer.createTransport(smtpConfig())

  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: 'ClauseIQ access temporarily restricted',
    text: `Your ClauseIQ portal access was restricted after ${maxStrikes} consecutive off-topic ClauseMind messages. Log in and use "Request unblock" for admin review.`,
    html: adminEmailShell(
      'Access restricted',
      `<p style="color:#475569;">Your portal access was temporarily restricted after repeated off-topic ClauseMind usage.</p>
       <p style="color:#475569;">Sign in and submit an unblock request — an admin will review it.</p>`
    ),
  })
}

export async function sendAccessRestoredEmail(to: string): Promise<void> {
  if (process.env.PLAYWRIGHT_TEST === '1') return

  const transporter = nodemailer.createTransport(smtpConfig())

  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: 'ClauseIQ access restored',
    text: 'Your ClauseIQ portal access has been restored. Please use ClauseMind for contract-related questions only.',
    html: adminEmailShell(
      'Access restored',
      `<p style="color:#475569;">Your portal access has been restored by an admin.</p>
       <p style="color:#475569;">Please use ClauseMind only for questions about your uploaded contracts.</p>`
    ),
  })
}
