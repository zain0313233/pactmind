"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AccessPolicy = {
  usage: string
  strikes: string
  appealSla: string
}

type AccessRestrictedOverlayProps = {
  open: boolean
  unblockRequestPending?: boolean
  onRequestSent?: () => void
}

export function AccessRestrictedOverlay({
  open,
  unblockRequestPending = false,
  onRequestSent,
}: AccessRestrictedOverlayProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(unblockRequestPending)
  const [policy, setPolicy] = useState<AccessPolicy | null>(null)

  useEffect(() => {
    if (!open) return
    void fetch("/api/access/policy", { credentials: "include" })
      .then((r) => r.json())
      .then((body: { policy?: AccessPolicy }) => {
        if (body.policy) setPolicy(body.policy)
      })
      .catch(() => undefined)
  }, [open])

  if (!open) return null

  async function sendUnblockRequest() {
    setSending(true)
    try {
      const res = await fetch("/api/access/unblock-request", {
        method: "POST",
        credentials: "include",
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Request failed")
      setSent(true)
      toast.success(body.message ?? "Request sent to admin")
      onRequestSent?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md border-destructive/40 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Access restricted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your access was temporarily restricted after repeated off-topic PactMind
            messages. Request an admin review to restore access.
          </p>
          {policy && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>{policy.usage}</p>
              <p>{policy.strikes}</p>
              <p className="font-medium text-amber-400/90">{policy.appealSla}</p>
            </div>
          )}
          <Button
            className="w-full"
            disabled={sending || sent}
            onClick={() => void sendUnblockRequest()}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {sent
              ? "Request sent — awaiting admin"
              : "Send request to admin for unblocking"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
