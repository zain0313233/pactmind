import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { CACHE } from "@/lib/cache-headers"
import type { SubStatus } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as SubStatus | null

    const users = await prisma.user.findMany({
      where: status ? { subscriptionStatus: status } : undefined,
      select: {
        id: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ users }, { status: 200, headers: CACHE.noStore })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status =
      message === "Forbidden"
        ? 403
        : message === "Unauthorized" || message === "Email not verified"
          ? 401
          : 400
    return NextResponse.json({ error: message }, { status })
  }
}
