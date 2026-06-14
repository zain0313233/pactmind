export const PLAN_LIMITS = {
  FREE: {
    documentUploads: 3,
    chatMessages: 20,
    portfolioSearches: 5,
    agentRuns: 3,
  },
  PRO: {
    documentUploads: 30,
    chatMessages: 200,
    portfolioSearches: 50,
    agentRuns: 30,
  },
  PRO_PLUS: {
    documentUploads: 999999,
    chatMessages: 999999,
    portfolioSearches: 999999,
    agentRuns: 999999,
  },
} as const

export type PlanKey = keyof typeof PLAN_LIMITS
export type UsageKey = keyof typeof PLAN_LIMITS["FREE"]

export const PLAN_LABELS: Record<PlanKey, string> = {
  FREE: "Free",
  PRO: "Pro",
  PRO_PLUS: "Pro Plus",
}

export const UPGRADEABLE_PLANS = ["PRO", "PRO_PLUS"] as const
export type UpgradeablePlan = (typeof UPGRADEABLE_PLANS)[number]
