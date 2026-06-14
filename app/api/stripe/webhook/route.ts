import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { getStripe, priceIdToPlan } from "@/lib/billing/stripe"
import { resetCurrentMonthUsage } from "@/lib/billing/checkUsage"

export const runtime = "nodejs"

function subscriptionId(
  value: string | Stripe.Subscription | null | undefined
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription
  if (legacy) {
    return subscriptionId(legacy)
  }
  return subscriptionId(invoice.parent?.subscription_details?.subscription ?? null)
}

function customerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function periodDates(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return {
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    stripePriceId: item.price.id,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) {
    throw new Error("checkout.session.completed missing userId metadata")
  }

  if (
    session.payment_status &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    throw new Error(`Checkout session not paid: ${session.payment_status}`)
  }

  const stripeCustomerId = customerId(session.customer)
  const stripeSubscriptionId = subscriptionId(session.subscription)
  if (!stripeCustomerId || !stripeSubscriptionId) {
    throw new Error("checkout.session.completed missing customer or subscription")
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new Error("Unknown userId in checkout session metadata")
  }
  if (user.stripeCustomerId && user.stripeCustomerId !== stripeCustomerId) {
    throw new Error("Stripe customer does not match user record")
  }

  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId)
  const period = periodDates(subscription)
  const plan = priceIdToPlan(period.stripePriceId)

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId,
      plan,
      subscriptionStatus: "ACTIVE",
    },
  })

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId,
      stripePriceId: period.stripePriceId,
      plan,
      status: "ACTIVE",
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: period.cancelAtPeriodEnd,
    },
    update: {
      stripeSubscriptionId,
      stripePriceId: period.stripePriceId,
      plan,
      status: "ACTIVE",
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: period.cancelAtPeriodEnd,
    },
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoiceSubscriptionId(invoice)
  if (!stripeSubscriptionId) return

  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId)
  const period = periodDates(subscription)
  const plan = priceIdToPlan(period.stripePriceId)

  const record = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  })
  if (!record) return

  await prisma.subscription.update({
    where: { id: record.id },
    data: {
      status: "ACTIVE",
      plan,
      stripePriceId: period.stripePriceId,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: period.cancelAtPeriodEnd,
    },
  })

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      plan,
      subscriptionStatus: "ACTIVE",
    },
  })

  await resetCurrentMonthUsage(record.userId)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoiceSubscriptionId(invoice)
  if (!stripeSubscriptionId) return

  const record = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  })
  if (!record) return

  await prisma.subscription.update({
    where: { id: record.id },
    data: { status: "PAST_DUE" },
  })

  await prisma.user.update({
    where: { id: record.userId },
    data: { subscriptionStatus: "PAST_DUE" },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const record = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })
  if (!record) return

  await prisma.subscription.update({
    where: { id: record.id },
    data: { status: "CANCELED" },
  })

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      plan: "FREE",
      subscriptionStatus: "CANCELED",
    },
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook signature missing", { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return new Response("Webhook signature invalid", { status: 400 })
  }

  const existing = await prisma.paymentEvent.findUnique({
    where: { eventId: event.id },
  })
  if (existing?.processed) {
    return new Response("Already processed", { status: 200 })
  }

  if (!existing) {
    await prisma.paymentEvent.create({
      data: { eventId: event.id, type: event.type },
    })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }

    await prisma.paymentEvent.update({
      where: { eventId: event.id },
      data: { processed: true },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook handler failed"
    console.error("[stripe.webhook]", event.type, message)
    return new Response("Webhook handler failed", { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
