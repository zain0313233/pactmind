import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminUser } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import type { Plan, SubStatus } from "@prisma/client"

const overrideSchema = z.object({
  userId: z.string().min(1),
  plan: z.enum(["FREE", "PRO", "PRO_PLUS"]),
  status: z.enum(["INACTIVE", "ACTIVE", "PAST_DUE", "CANCELED"]),
})

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser(req)
    const body = overrideSchema.parse(await req.json())

    const target = await prisma.user.findUnique({ where: { id: body.userId } })
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: body.userId },
      data: {
        plan: body.plan as Plan,
        subscriptionStatus: body.status as SubStatus,
      },
    })

    await prisma.paymentEvent.create({
      data: {
        eventId: `admin-override-${body.userId}-${Date.now()}`,
        type: "ADMIN_OVERRIDE",
        processed: true,
      },
    })

    return NextResponse.json(
      {
        message: "Billing override applied",
        userId: body.userId,
        plan: body.plan,
        status: body.status,
        actorUserId: admin.id,
      },
      { status: 200 }
    )
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
