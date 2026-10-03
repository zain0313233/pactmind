import { NextRequest, NextResponse } from 'next/server'

export const AUTH_COOKIE_NAME = 'pactmind_session'

export function getSessionMaxAgeSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN || '1d'
  const match = raw.match(/^(\d+)([dhms])$/)
  if (!match) return 86400

  const amount = parseInt(match[1], 10)
  switch (match[2]) {
    case 'd':
      return amount * 86400
    case 'h':
      return amount * 3600
    case 'm':
      return amount * 60
    case 's':
      return amount
    default:
      return 86400
  }
}

export function getSessionToken(req: NextRequest): string | null {
  const fromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value
  if (fromCookie) return fromCookie

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: getSessionMaxAgeSeconds(),
  })
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
