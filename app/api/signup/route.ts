import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { setAuthCookie } from '@/lib/auth-cookie'
import { signupSchema } from '@/validators/auth.schema'
import { userService } from '@/services/user.service'

function signupErrorStatus(message: string): number {
  if (message.startsWith('An account with this email already exists')) return 409
  if (message === 'Too many codes sent. Please try again later.') return 429
  return 400
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = signupSchema.parse(body)
    const result = await userService.signup(input)
    const response = NextResponse.json({ user: result.user }, { status: 201 })
    setAuthCookie(response, result.token)
    return response
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? 'Invalid form data'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json(
      { error: message },
      { status: signupErrorStatus(message) }
    )
  }
}
