import { useQuery } from "@tanstack/react-query"
import { fetchJson } from "@/lib/api-client"
import type { PlanKey, UsageKey } from "@/lib/billing/planConfig"

export type BillingStatus = {
  plan: PlanKey
  effectivePlan?: PlanKey
  subscriptionStatus: string
  usage: Record<UsageKey, number>
  limits: Record<UsageKey, number>
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing-status"],
    queryFn: () => fetchJson<BillingStatus>("/api/billing/status"),
  })
}
