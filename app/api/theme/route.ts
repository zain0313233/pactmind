import { NextRequest, NextResponse } from "next/server"
import { requireAuthUser } from '@/lib/auth-session'
import { hasPermission } from "@/lib/rbac"
import { themeRepository } from "@/repositories/theme.repository"
import { userRepository } from "@/repositories/user.repository"
import { themeSchema } from "@/validators/theme.schema"
import { CACHE } from "@/lib/cache-headers"
import { normalizeTheme } from "@/lib/theme"

export async function GET() {
  try {
    const theme = await themeRepository.getForRender()
    return NextResponse.json({ theme }, { status: 200, headers: CACHE.publicTheme })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load theme"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuthUser(req)
    const userId = user.id
    if (!hasPermission(user.role, 'theme:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const input = themeSchema.parse(body)
    const theme = normalizeTheme(input)

    await themeRepository.upsert(theme, userId)

    return NextResponse.json({ message: "Theme saved", theme }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save theme"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
