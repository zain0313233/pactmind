"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Check, Loader2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchJson } from "@/lib/api-client"
import {
  PLAN_LABELS,
  PLAN_LIMITS,
  type PlanKey,
  type UpgradeablePlan,
} from "@/lib/billing/planConfig"
import { cn } from "@/lib/utils"

type UpgradeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanKey
}

const UPGRADE_PLANS: UpgradeablePlan[] = ["PRO", "PRO_PLUS"]

const PLAN_PRICING: Record<UpgradeablePlan, string> = {
  PRO: "$29 / month",
  PRO_PLUS: "$79 / month",
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentPlan,
}: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<UpgradeablePlan | null>(null)

  async function startCheckout(plan: UpgradeablePlan) {
    setLoadingPlan(plan)
    try {
      const { url } = await fetchJson<{ url: string }>(
        "/api/billing/create-checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        }
      )
      window.location.href = url
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      )
      setLoadingPlan(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-card p-6 shadow-xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Upgrade your plan
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Current plan: {PLAN_LABELS[currentPlan]}
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {UPGRADE_PLANS.map((plan) => {
              const limits = PLAN_LIMITS[plan]
              const isCurrent = currentPlan === plan
              const isDowngrade =
                currentPlan === "PRO_PLUS" && plan === "PRO"

              return (
                <Card
                  key={plan}
                  className={cn(
                    "border-border/60 bg-background/40",
                    plan === "PRO_PLUS" && "ring-1 ring-primary/30"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {PLAN_LABELS[plan]}
                      </CardTitle>
                      {plan === "PRO_PLUS" ? (
                        <Badge variant="secondary">Best value</Badge>
                      ) : null}
                    </div>
                    <CardDescription>{PLAN_PRICING[plan]}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {limits.documentUploads >= 999999
                          ? "Unlimited document uploads"
                          : `${limits.documentUploads} uploads / month`}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {limits.chatMessages >= 999999
                          ? "Unlimited chat messages"
                          : `${limits.chatMessages} chat messages / month`}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {limits.portfolioSearches >= 999999
                          ? "Unlimited portfolio searches"
                          : `${limits.portfolioSearches} portfolio searches / month`}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {limits.agentRuns >= 999999
                          ? "Unlimited agent runs"
                          : `${limits.agentRuns} agent runs / month`}
                      </li>
                    </ul>

                    <Button
                      className="w-full"
                      disabled={isCurrent || isDowngrade || loadingPlan !== null}
                      onClick={() => startCheckout(plan)}
                    >
                      {loadingPlan === plan ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redirecting…
                        </>
                      ) : isCurrent ? (
                        "Current plan"
                      ) : (
                        `Upgrade to ${PLAN_LABELS[plan]}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
