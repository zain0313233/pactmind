"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Scale,
  Shield,
  Users,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PACTMIND_NAME } from "@/lib/pactmind"
import { cn } from "@/lib/utils"
import type { AgentOpinion, AgentReport } from "@/types/agents"

const AGENT_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  scale: Scale,
  wallet: Wallet,
  briefcase: Briefcase,
}

const verdictStyles = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  concern: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
}

const verdictLabels = {
  ok: "No major issues",
  concern: "Needs review",
  critical: "Critical flags",
}

type DocumentAgentsTabProps = {
  documentId: string
  documentReady: boolean
}

export function DocumentAgentsTab({
  documentId,
  documentReady,
}: DocumentAgentsTabProps) {
  const [report, setReport] = useState<AgentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/agents`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) setReport(data.report)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  useEffect(() => {
    if (!report || report.status !== "pending") return
    const id = setInterval(fetchReport, 5000)
    return () => clearInterval(id)
  }, [report, fetchReport])

  async function handleRerun() {
    setRerunning(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/agents`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Agent team analysis started")
      await fetchReport()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start agents")
    } finally {
      setRerunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const agents = (report?.agents as AgentOpinion[] | null) ?? []
  const criticalCount = agents.filter((a) => a.verdict === "critical").length
  const concernCount = agents.filter((a) => a.verdict === "concern").length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">PactMind Agent Team</p>
            <p className="text-xs text-muted-foreground">
              Four specialists review this contract in parallel
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!documentReady || rerunning}
          onClick={handleRerun}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", rerunning && "animate-spin")} />
          Re-run agents
        </Button>
      </div>

      {!report || report.status === "pending" ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {PACTMIND_NAME} agent team is reviewing…
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reviewer · Compliance · Finance · Executive
            </p>
          </CardContent>
        </Card>
      ) : report.status === "failed" ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />
            <p className="text-sm font-medium">Agent analysis failed</p>
            <Button size="sm" className="mt-4" onClick={handleRerun}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {(criticalCount > 0 || concernCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {criticalCount > 0 && (
                <Badge variant="outline" className={verdictStyles.critical}>
                  {criticalCount} critical
                </Badge>
              )}
              {concernCount > 0 && (
                <Badge variant="outline" className={verdictStyles.concern}>
                  {concernCount} need review
                </Badge>
              )}
              {agents.filter((a) => a.verdict === "ok").length > 0 && (
                <Badge variant="outline" className={verdictStyles.ok}>
                  {agents.filter((a) => a.verdict === "ok").length} clear
                </Badge>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.icon] ?? Shield
              return (
                <Card
                  key={agent.id}
                  className="border-border/60 bg-card/40 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{agent.name}</p>
                          <p className="text-[10px] text-muted-foreground">{agent.role}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          verdictStyles[agent.verdict]
                        )}
                      >
                        {verdictLabels[agent.verdict]}
                      </Badge>
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {agent.summary}
                      </p>
                      {agent.findings.length > 0 && (
                        <ul className="space-y-1.5">
                          {agent.findings.map((finding, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[11px] leading-relaxed text-foreground/90"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                              {finding}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="text-[9px] capitalize">
                          {agent.confidence} confidence
                        </Badge>
                        {agent.verdict === "ok" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
