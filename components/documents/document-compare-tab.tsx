"use client"

import { useCallback, useEffect, useState } from "react"
import { useTemplatesQuery } from "@/hooks/use-templates-query"
import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  GitCompare,
  Loader2,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PACTMIND_NAME } from "@/lib/pactmind"
import { cn } from "@/lib/utils"
import {
  TEMPLATE_TYPES,
  type ClauseDeviation,
  type ComparisonSummary,
  type DocumentComparison,
} from "@/types/comparison"

const flagStyles: Record<string, string> = {
  aligned: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  deviation: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  missing: "border-red-500/30 bg-red-500/10 text-red-400",
  extra: "border-purple-500/30 bg-purple-500/10 text-purple-400",
}

const severityStyles: Record<string, string> = {
  high: "border-red-500/30 text-red-400",
  medium: "border-amber-500/30 text-amber-400",
  low: "border-slate-500/30 text-slate-400",
  none: "border-border text-muted-foreground",
}

function typeLabel(value: string) {
  return TEMPLATE_TYPES.find((t) => t.value === value)?.label ?? value
}

type DocumentCompareTabProps = {
  documentId: string
  documentReady: boolean
}

export function DocumentCompareTab({
  documentId,
  documentReady,
}: DocumentCompareTabProps) {
  const { data: templates = [], isLoading: loadingTemplates } = useTemplatesQuery()
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [comparison, setComparison] = useState<DocumentComparison | null>(null)
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id)
    }
  }, [templates, selectedTemplateId])

  const fetchComparison = useCallback(async (templateId: string) => {
    if (!templateId) return
    try {
      const res = await fetch(
        `/api/documents/${documentId}/compare?templateId=${templateId}`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (res.ok) setComparison(data.comparison)
      else setComparison(null)
    } catch {
      setComparison(null)
    }
  }, [documentId])

  useEffect(() => {
    if (selectedTemplateId) fetchComparison(selectedTemplateId)
  }, [selectedTemplateId, fetchComparison])

  useEffect(() => {
    if (!comparison || comparison.status !== "pending") return
    const id = setInterval(() => fetchComparison(selectedTemplateId), 5000)
    return () => clearInterval(id)
  }, [comparison, selectedTemplateId, fetchComparison])

  async function handleCompare() {
    if (!selectedTemplateId) {
      toast.error("Select a standard template")
      return
    }

    setComparing(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/compare`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ template_id: selectedTemplateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Comparison started")
      await fetchComparison(selectedTemplateId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comparison failed")
    } finally {
      setComparing(false)
    }
  }

  const deviations = (comparison?.deviations as ClauseDeviation[] | null) ?? []
  const summary = comparison?.summary as ComparisonSummary | null

  if (loadingTemplates) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <Shield className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">No standard templates yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Upload a gold-standard contract first, then compare this document against it.
          </p>
          <Link
            href="/dashboard/standards"
            className={cn(buttonVariants({ size: "sm" }), "mt-4")}
          >
            Upload standard template
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Compare against
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({typeLabel(tpl.type)})
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!documentReady || comparing || !selectedTemplateId}
            onClick={handleCompare}
          >
            {comparing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <GitCompare className="h-3.5 w-3.5" />
            )}
            Compare to standard
          </Button>
        </CardContent>
      </Card>

      {!comparison ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a template and run a comparison to see deviations.
          </CardContent>
        </Card>
      ) : comparison.status === "pending" ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {PACTMIND_NAME} is comparing clause-by-clause…
            </p>
          </CardContent>
        </Card>
      ) : comparison.status === "failed" ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />
            <p className="text-sm font-medium">Comparison failed</p>
            <Button size="sm" className="mt-4" onClick={handleCompare}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Deviation score"
              value={comparison.deviationScore ?? "—"}
              suffix="/100"
              hint="Lower is better"
            />
            <StatCard label="Aligned" value={comparison.alignedCount} color="text-emerald-400" />
            <StatCard label="Deviations" value={comparison.deviationCount} color="text-amber-400" />
            <StatCard label="Missing" value={comparison.missingCount} color="text-red-400" />
          </div>

          {summary?.overview && (
            <Card className="border-border/60 bg-card/40">
              <CardContent className="p-4 text-sm">
                <p className="leading-relaxed text-muted-foreground">{summary.overview}</p>
                {summary.recommendation && (
                  <p className="mt-2 text-xs font-medium text-foreground">
                    Recommendation: {summary.recommendation}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <GitCompare className="h-4 w-4 text-primary" />
                Deviation table — {deviations.length} clauses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviations.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  No deviations found — contract aligns with standard
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] space-y-3">
                    {deviations.map((row, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border/50 bg-background/30 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{row.clause}</p>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] capitalize", flagStyles[row.flag])}
                          >
                            {row.flag}
                          </Badge>
                          {row.severity !== "none" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] capitalize",
                                severityStyles[row.severity]
                              )}
                            >
                              {row.severity}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Standard
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {row.standardText || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Contract
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {row.contractText || "—"}
                            </p>
                          </div>
                        </div>
                        {row.notes && (
                          <p className="mt-2 text-[11px] italic text-muted-foreground">
                            {row.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  suffix,
  hint,
  color,
}: {
  label: string
  value: number | string
  suffix?: string
  hint?: string
  color?: string
}) {
  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-3xl font-bold leading-none", color)}>
          {value}
          {suffix && (
            <span className="text-base font-normal text-muted-foreground">{suffix}</span>
          )}
        </p>
        {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
