import type { Plan } from "@prisma/client"
import type { PlanKey } from "@/lib/billing/planConfig"

export function normalizeStripePriceId(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "")
}

export function configuredStripePriceIds(): { pro: string; proPlus: string } {
  const pro = normalizeStripePriceId(process.env.STRIPE_PRO_PRICE_ID ?? "")
  const proPlus = normalizeStripePriceId(process.env.STRIPE_PRO_PLUS_PRICE_ID ?? "")

  if (!pro.startsWith("price_") || !proPlus.startsWith("price_")) {
    throw new Error("STRIPE_PRO_PRICE_ID and STRIPE_PRO_PLUS_PRICE_ID must be configured")
  }

  return { pro, proPlus }
}

export function priceIdToPlan(priceId: string): Plan {
  const normalized = normalizeStripePriceId(priceId)
  const { pro, proPlus } = configuredStripePriceIds()

  if (normalized === pro) return "PRO"
  if (normalized === proPlus) return "PRO_PLUS"

  throw new Error(`Unrecognized Stripe price ID: ${normalized}`)
}

/** Plan used for quota enforcement — paid limits require ACTIVE subscription. */
export function effectivePlanForUser(user: {
  plan: string
  subscriptionStatus: string
}): PlanKey {
  if (user.subscriptionStatus !== "ACTIVE") {
    return "FREE"
  }
  return user.plan as PlanKey
}
