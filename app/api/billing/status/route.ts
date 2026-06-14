import { NextRequest, NextResponse } from "next/server"
import { requirePortalAccess } from "@/lib/auth-session"
import { prisma } from "@/lib/prisma"
import { getCurrentUsage } from "@/lib/billing/checkUsage"
import { PLAN_LIMITS } from "@/lib/billing/planConfig"
import { effectivePlanForUser } from "@/lib/billing/plan-utils"
import { CACHE } from "@/lib/cache-headers"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePortalAccess(req)

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const usage = await getCurrentUsage(user.id)
    const effectivePlan = effectivePlanForUser(dbUser)
    const limits = PLAN_LIMITS[effectivePlan]

    return NextResponse.json(
      {
        plan: dbUser.plan,
        effectivePlan,
        subscriptionStatus: dbUser.subscriptionStatus,
        usage: {
          documentUploads: usage.documentUploads,
          chatMessages: usage.chatMessages,
          portfolioSearches: usage.portfolioSearches,
          agentRuns: usage.agentRuns,
        },
        limits,
      },
      { status: 200, headers: CACHE.noStore }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load billing status"
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Email not verified" || message === "Access restricted"
          ? 403
          : 400
    return NextResponse.json({ error: message }, { status })
  }
}
