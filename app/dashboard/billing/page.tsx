import { Suspense } from "react"
import { BillingPanel } from "@/components/billing/BillingPanel"

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
      <BillingPanel />
    </Suspense>
  )
}
