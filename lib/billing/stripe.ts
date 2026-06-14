import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import type { Plan } from "@prisma/client"
import type { UpgradeablePlan } from "@/lib/billing/planConfig"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    })
  }
  return stripeClient
}

export function planToPriceId(plan: UpgradeablePlan): string {
  const raw =
    plan === "PRO"
      ? requireEnv("STRIPE_PRO_PRICE_ID")
      : requireEnv("STRIPE_PRO_PLUS_PRICE_ID")

  const priceId = raw.trim().replace(/^["']|["']$/g, "")

  if (priceId.startsWith("prod_")) {
    throw new Error(
      `${plan === "PRO" ? "STRIPE_PRO_PRICE_ID" : "STRIPE_PRO_PLUS_PRICE_ID"} is a product ID (prod_…). Use the Price ID (price_…) from Stripe → Product → Pricing.`
    )
  }

  if (!priceId.startsWith("price_")) {
    throw new Error(
      `${plan === "PRO" ? "STRIPE_PRO_PRICE_ID" : "STRIPE_PRO_PLUS_PRICE_ID"} must be a Stripe Price ID starting with price_`
    )
  }

  return priceId
}

export function priceIdToPlan(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PRO"
  if (priceId === process.env.STRIPE_PRO_PLUS_PRICE_ID) return "PRO_PLUS"
  return "FREE"
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new Error("User not found")
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

export async function createCheckoutSession({
  userId,
  email,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: string
  email: string
  priceId: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  })

  if (!session.url) {
    throw new Error("Failed to create checkout session")
  }

  return session.url
}

export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })

  return session.url
}
