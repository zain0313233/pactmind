"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { fetchJson } from "@/lib/api-client"

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false)

  async function openPortal() {
    setLoading(true)
    try {
      const { url } = await fetchJson<{ url: string }>(
        "/api/billing/create-portal",
        { method: "POST" }
      )
      window.location.href = url
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open billing portal"
      )
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={openPortal}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening…
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          Manage billing
        </>
      )}
    </Button>
  )
}
