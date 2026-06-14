import { NextRequest, NextResponse } from "next/server"
import { requirePortalAccess } from "@/lib/auth-session"
import { prisma } from "@/lib/prisma"
import { createPortalSession } from "@/lib/billing/stripe"

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}${path}`
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalAccess(req)

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 400 }
      )
    }

    const url = await createPortalSession(
      dbUser.stripeCustomerId,
      appUrl("/dashboard/billing")
    )

    return NextResponse.json({ url }, { status: 200 })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create portal session"
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Email not verified" || message === "Access restricted"
          ? 403
          : 400
    return NextResponse.json({ error: message }, { status })
  }
}
