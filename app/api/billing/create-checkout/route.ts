import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAccess } from "@/lib/auth-session"
import {
  createCheckoutSession,
  planToPriceId,
} from "@/lib/billing/stripe"
import type { UpgradeablePlan } from "@/lib/billing/planConfig"

const checkoutSchema = z.object({
  plan: z.enum(["PRO", "PRO_PLUS"]),
})

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}${path}`
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalAccess(req)
    const body = checkoutSchema.parse(await req.json())
    const plan = body.plan as UpgradeablePlan
    const priceId = planToPriceId(plan)

    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId,
      successUrl: appUrl("/dashboard/billing?billing=success"),
      cancelUrl: appUrl("/dashboard/billing?billing=canceled"),
    })

    return NextResponse.json({ url }, { status: 200 })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session"
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Email not verified" || message === "Access restricted"
          ? 403
          : 400
    return NextResponse.json({ error: message }, { status })
  }
}
