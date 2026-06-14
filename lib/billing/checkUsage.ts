import { prisma } from "@/lib/prisma"
import {
  PLAN_LIMITS,
  type PlanKey,
  type UsageKey,
} from "@/lib/billing/planConfig"

const FEATURE_LABELS: Record<UsageKey, string> = {
  documentUploads: "document uploads",
  chatMessages: "chat messages",
  portfolioSearches: "portfolio searches",
  agentRuns: "agent runs",
}

function currentMonthYear() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export async function checkAndIncrementUsage(
  userId: string,
  feature: UsageKey
): Promise<{ allowed: boolean; reason?: string }> {
  const { month, year } = currentMonthYear()

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { allowed: false, reason: "User not found" }
    }

    if (user.role === "admin") {
      return { allowed: true }
    }

    const plan = user.plan as PlanKey
    const limit = PLAN_LIMITS[plan][feature]

    const usage = await tx.usage.upsert({
      where: {
        userId_month_year: { userId, month, year },
      },
      create: { userId, month, year },
      update: {},
    })

    const current = usage[feature]
    if (current >= limit) {
      return {
        allowed: false,
        reason: `Monthly ${FEATURE_LABELS[feature]} limit reached on your ${plan} plan. Upgrade to continue.`,
      }
    }

    await tx.usage.update({
      where: { id: usage.id },
      data: { [feature]: { increment: 1 } },
    })

    return { allowed: true }
  })
}

export async function getCurrentUsage(userId: string) {
  const { month, year } = currentMonthYear()
  return prisma.usage.upsert({
    where: {
      userId_month_year: { userId, month, year },
    },
    create: { userId, month, year },
    update: {},
  })
}

export async function resetCurrentMonthUsage(userId: string) {
  const { month, year } = currentMonthYear()
  await prisma.usage.upsert({
    where: {
      userId_month_year: { userId, month, year },
    },
    create: { userId, month, year },
    update: {
      documentUploads: 0,
      chatMessages: 0,
      portfolioSearches: 0,
      agentRuns: 0,
    },
  })
}
