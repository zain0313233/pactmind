"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, CreditCard, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  PLAN_LABELS,
  PLAN_LIMITS,
  UPGRADEABLE_PLANS,
  type PlanKey,
  type UpgradeablePlan,
} from "@/lib/billing/planConfig"
import { useBillingStatus } from "@/hooks/use-billing-status"
import { UpgradeModal } from "@/components/billing/UpgradeModal"
import { ManageBillingButton } from "@/components/billing/ManageBillingButton"
import { cn } from "@/lib/utils"

const PLAN_PRICING: Record<UpgradeablePlan, string> = {
  PRO: "$29 / month",
  PRO_PLUS: "$79 / month",
}

function formatLimit(value: number) {
  return value >= 999999 ? "Unlimited" : String(value)
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ")
}

export function BillingPanel() {
  const searchParams = useSearchParams()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const { data, isLoading, error } = useBillingStatus()

  useEffect(() => {
    const billing = searchParams.get("billing")
    if (billing === "success") {
      toast.success("Subscription updated successfully.")
    } else if (billing === "canceled") {
      toast.message("Checkout canceled.")
    }
  }, [searchParams])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load billing"}
      </p>
    )
  }

  const currentPlan = data.plan

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Billing
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage your subscription and compare plans.
        </p>
      </div>

      <Card className="border-border/60 bg-card/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Current plan</CardTitle>
              <CardDescription className="mt-1">
                Subscription status and billing management
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {PLAN_LABELS[currentPlan]}
              </Badge>
              <Badge
                variant={
                  data.subscriptionStatus === "ACTIVE" ? "default" : "outline"
                }
              >
                {statusLabel(data.subscriptionStatus)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {currentPlan !== "PRO_PLUS" && (
            <Button size="sm" onClick={() => setUpgradeOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Upgrade plan
            </Button>
          )}
          <ManageBillingButton />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Available plans
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <PlanCard
            plan="FREE"
            price="Free"
            current={currentPlan === "FREE"}
            limits={PLAN_LIMITS.FREE}
          />
          {UPGRADEABLE_PLANS.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              price={PLAN_PRICING[plan]}
              current={currentPlan === plan}
              limits={PLAN_LIMITS[plan]}
              onUpgrade={
                currentPlan !== plan
                  ? () => setUpgradeOpen(true)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={currentPlan}
      />
    </div>
  )
}

function PlanCard({
  plan,
  price,
  current,
  limits,
  onUpgrade,
}: {
  plan: PlanKey
  price: string
  current: boolean
  limits: (typeof PLAN_LIMITS)[PlanKey]
  onUpgrade?: () => void
}) {
  return (
    <Card
      className={cn(
        "border-border/60 bg-card/40",
        current && "ring-1 ring-primary/40",
        plan === "PRO_PLUS" && !current && "ring-1 ring-primary/20"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{PLAN_LABELS[plan]}</CardTitle>
          {current && (
            <Badge variant="outline" className="text-[10px]">
              Current
            </Badge>
          )}
          {plan === "PRO_PLUS" && !current && (
            <Badge variant="secondary" className="text-[10px]">
              Best value
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm font-medium text-foreground">
          {price}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            {formatLimit(limits.documentUploads)} uploads / mo
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            {formatLimit(limits.chatMessages)} chat messages / mo
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            {formatLimit(limits.portfolioSearches)} portfolio searches / mo
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            {formatLimit(limits.agentRuns)} agent runs / mo
          </li>
        </ul>
        {onUpgrade && (
          <Button size="sm" className="w-full" onClick={onUpgrade}>
            <CreditCard className="h-4 w-4" />
            Upgrade to {PLAN_LABELS[plan]}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
