"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertTriangle, BarChart3 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PLAN_LABELS, type UsageKey } from "@/lib/billing/planConfig"
import { useBillingStatus } from "@/hooks/use-billing-status"
import { cn } from "@/lib/utils"

const USAGE_ITEMS: { key: UsageKey; label: string; description: string }[] = [
  {
    key: "documentUploads",
    label: "Document uploads",
    description: "Contracts uploaded and processed each month",
  },
  {
    key: "chatMessages",
    label: "Chat messages",
    description: "ClauseMind questions across your documents",
  },
  {
    key: "portfolioSearches",
    label: "Portfolio searches",
    description: "Cross-contract searches in your library",
  },
  {
    key: "agentRuns",
    label: "Agent runs",
    description: "Multi-agent contract analysis sessions",
  },
]

function usagePercent(used: number, limit: number) {
  if (limit >= 999999) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function UsagePanel() {
  const { data, isLoading, error } = useBillingStatus()

  const nearLimit = useMemo(() => {
    if (!data) return false
    return USAGE_ITEMS.some(({ key }) => {
      const limit = data.limits[key]
      if (limit >= 999999) return false
      return usagePercent(data.usage[key], limit) >= 80
    })
  }, [data])

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading usage…</p>
    )
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load usage"}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Usage
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track monthly feature usage on your{" "}
          <span className="font-medium text-foreground">
            {PLAN_LABELS[data.plan]}
          </span>{" "}
          plan. Limits reset on your billing cycle.
        </p>
      </div>

      {nearLimit && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  You&apos;re approaching a plan limit
                </p>
                <p className="text-xs text-muted-foreground">
                  Upgrade for higher monthly limits.
                </p>
              </div>
            </div>
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard/billing" />}>
              View plans
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            This month
          </CardTitle>
          <CardDescription>
            Resets when your subscription renews or at the start of each calendar
            month on the Free plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {USAGE_ITEMS.map(({ key, label, description }) => {
            const used = data.usage[key]
            const limit = data.limits[key]
            const percent = usagePercent(used, limit)
            const unlimited = limit >= 999999
            const atLimit = !unlimited && used >= limit

            return (
              <div key={key} className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {unlimited ? `${used} used` : `${used} / ${limit}`}
                    </span>
                    {atLimit && (
                      <Badge variant="destructive" className="text-[10px]">
                        Limit reached
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      atLimit || percent >= 80
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{ width: unlimited ? "0%" : `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
