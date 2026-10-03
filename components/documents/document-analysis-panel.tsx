"use client"



import dynamic from "next/dynamic"

import { useCallback, useEffect, useState } from "react"

import Link from "next/link"

import {

  AlertTriangle,

  CheckCircle2,

  FileText,

  Loader2,

  RefreshCw,

  Shield,

  MessageSquare,

  ChevronLeft,

  ListChecks,

  Calendar,

  BookOpen,

  GitCompare,

  Users,

} from "lucide-react"

import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


import { PACTMIND_NAME } from "@/lib/pactmind"

import { cn } from "@/lib/utils"

const DocumentChatTab = dynamic(
  () =>
    import("@/components/documents/document-chat-tab").then((m) => ({
      default: m.DocumentChatTab,
    })),
  { loading: () => <TabLoader /> }
)

const DocumentCompareTab = dynamic(
  () =>
    import("@/components/documents/document-compare-tab").then((m) => ({
      default: m.DocumentCompareTab,
    })),
  { loading: () => <TabLoader /> }
)

const DocumentAgentsTab = dynamic(
  () =>
    import("@/components/documents/document-agents-tab").then((m) => ({
      default: m.DocumentAgentsTab,
    })),
  { loading: () => <TabLoader /> }
)

function TabLoader() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  )
}

import type {

  ContractObligation,

  ContractRisk,

  ContractSummary,

  DocumentAnalysis,

  MissingClause,

  TimelineEvent,

} from "@/types/analysis"



type DocumentInfo = {

  id: string

  title: string

  fileName: string

  fileType: string

  status: string

}



const riskLevelStyles = {

  high: "text-red-400 border-red-500/30 bg-red-500/10",

  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",

  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",

}



const severityStyles = {

  high: "border-red-500/30 bg-red-500/10 text-red-400",

  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",

  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",

}



const obligationTypeStyles: Record<string, string> = {

  payment: "border-emerald-500/30 text-emerald-400",

  delivery: "border-blue-500/30 text-blue-400",

  notice: "border-purple-500/30 text-purple-400",

  renewal: "border-amber-500/30 text-amber-400",

  confidentiality: "border-slate-500/30 text-slate-400",

  other: "border-border text-muted-foreground",

}



const timelineTypeStyles: Record<string, string> = {

  expiration: "border-red-500/30 text-red-400",

  deadline: "border-amber-500/30 text-amber-400",

  renewal: "border-blue-500/30 text-blue-400",

  notice: "border-purple-500/30 text-purple-400",

  payment: "border-emerald-500/30 text-emerald-400",

  effective: "border-slate-500/30 text-slate-400",

  other: "border-border text-muted-foreground",

}



export function DocumentAnalysisPanel({ documentId }: { documentId: string }) {

  const [document, setDocument] = useState<DocumentInfo | null>(null)

  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)

  const [loading, setLoading] = useState(true)

  const [reanalyzing, setReanalyzing] = useState(false)

  const [activeTab, setActiveTab] = useState("overview")

  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set(["overview"])
  )

  const [chatSeed, setChatSeed] = useState<{

    question: string

    mode: "plain_english" | "default"

    key: number

  } | null>(null)



  const fetchData = useCallback(async () => {

    try {

      const [docRes, analysisRes] = await Promise.all([

        fetch(`/api/documents/${documentId}`, { credentials: "include" }),

        fetch(`/api/documents/${documentId}/analysis`, { credentials: "include" }),

      ])



      const docData = await docRes.json()

      const analysisData = await analysisRes.json()



      if (docRes.ok) setDocument(docData.document)

      if (analysisRes.ok) setAnalysis(analysisData.analysis)

    } finally {

      setLoading(false)

    }

  }, [documentId])



  useEffect(() => {

    fetchData()

  }, [fetchData])



  useEffect(() => {

    setVisitedTabs((prev) => {

      if (prev.has(activeTab)) return prev

      const next = new Set(prev)

      next.add(activeTab)

      return next

    })

  }, [activeTab])



  useEffect(() => {

    if (!analysis || analysis.status !== "pending") return

    const id = setInterval(fetchData, 5000)

    return () => clearInterval(id)

  }, [analysis, fetchData])



  async function handleReanalyze() {

    setReanalyzing(true)

    try {

      const res = await fetch(`/api/documents/${documentId}/analysis`, {

        method: "POST",

        credentials: "include",

      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast.success("PactMind analysis started")

      await fetchData()

    } catch (err) {

      toast.error(err instanceof Error ? err.message : "Failed to start analysis")

    } finally {

      setReanalyzing(false)

    }

  }



  function explainRisk(risk: ContractRisk) {

    const clausePart = risk.clause

      ? `Clause excerpt: "${risk.clause}"`

      : `Risk: ${risk.title} — ${risk.description}`

    setChatSeed({

      question: `Explain in plain English what this means for me and what I should watch out for. ${clausePart}`,

      mode: "plain_english",

      key: Date.now(),

    })

    setVisitedTabs((prev) => new Set(prev).add("chat"))

    setActiveTab("chat")

  }



  if (loading) {

    return (

      <div className="flex justify-center py-20">

        <Loader2 className="h-6 w-6 animate-spin text-primary" />

      </div>

    )

  }



  if (!document) {

    return (

      <p className="py-20 text-center text-sm text-muted-foreground">

        Document not found

      </p>

    )

  }



  const summary = analysis?.summary as ContractSummary | null

  const risks = (analysis?.risks as ContractRisk[] | null) ?? []

  const missing = (analysis?.missingClauses as MissingClause[] | null) ?? []

  const obligations = (analysis?.obligations as ContractObligation[] | null) ?? []

  const timeline = (analysis?.timeline as TimelineEvent[] | null) ?? []



  return (

    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link

            href="/dashboard/documents"

            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"

          >

            <ChevronLeft className="h-3.5 w-3.5" />

            Back to documents

          </Link>

          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">

            {document.title}

          </h1>

          <p className="mt-1.5 text-sm text-muted-foreground">

            {PACTMIND_NAME} contract review workspace

          </p>

        </div>

        <div className="flex gap-2">

          <Button

            size="sm"

            variant="outline"

            className="gap-1.5"

            disabled={reanalyzing || document.status !== "ready"}

            onClick={handleReanalyze}

          >

            <RefreshCw className={cn("h-3.5 w-3.5", reanalyzing && "animate-spin")} />

            Re-analyze

          </Button>

          <Link

            href={`/chat/${documentId}`}

            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}

          >

            <MessageSquare className="h-3.5 w-3.5" />

            Full chat

          </Link>

        </div>

      </div>



      {!analysis || analysis.status === "pending" ? (

        <Card className="border-border/60 bg-card/40">

          <CardContent className="flex flex-col items-center py-16 text-center">

            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />

            <p className="text-sm font-medium">{PACTMIND_NAME} is analyzing this contract…</p>

            <p className="mt-1 text-xs text-muted-foreground">

              Risk scan, obligations, timeline, and summary in progress

            </p>

          </CardContent>

        </Card>

      ) : analysis.status === "failed" ? (

        <Card className="border-border/60 bg-card/40">

          <CardContent className="flex flex-col items-center py-16 text-center">

            <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />

            <p className="text-sm font-medium">Analysis failed</p>

            <Button size="sm" className="mt-4" onClick={handleReanalyze}>

              Try again

            </Button>

          </CardContent>

        </Card>

      ) : (

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">

            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">

              <FileText className="h-3.5 w-3.5" />

              Overview

            </TabsTrigger>

            <TabsTrigger value="agents" className="gap-1.5 text-xs sm:text-sm">

              <Users className="h-3.5 w-3.5" />

              Agents

            </TabsTrigger>

            <TabsTrigger value="risks" className="gap-1.5 text-xs sm:text-sm">

              <AlertTriangle className="h-3.5 w-3.5" />

              Risks

              {risks.length > 0 && (

                <Badge variant="secondary" className="h-4 px-1 text-[10px]">

                  {risks.length}

                </Badge>

              )}

            </TabsTrigger>

            <TabsTrigger value="obligations" className="gap-1.5 text-xs sm:text-sm">

              <ListChecks className="h-3.5 w-3.5" />

              Obligations

              {obligations.length > 0 && (

                <Badge variant="secondary" className="h-4 px-1 text-[10px]">

                  {obligations.length}

                </Badge>

              )}

            </TabsTrigger>

            <TabsTrigger value="compare" className="gap-1.5 text-xs sm:text-sm">

              <GitCompare className="h-3.5 w-3.5" />

              Compare

            </TabsTrigger>

            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">

              <MessageSquare className="h-3.5 w-3.5" />

              Chat

            </TabsTrigger>

          </TabsList>



          <TabsContent value="overview" className="mt-4 space-y-6">

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <ScoreCard

                label="Risk score"

                value={analysis.riskScore ?? "—"}

                suffix="/100"

                level={analysis.riskLevel}

              />

              <CountCard label="High risks" value={analysis.highRiskCount} color="text-red-400" />

              <CountCard label="Medium risks" value={analysis.mediumRiskCount} color="text-amber-400" />

              <CountCard label="Obligations" value={obligations.length} color="text-blue-400" />

            </div>



            <div className="grid gap-6 lg:grid-cols-2">

              <Card className="border-border/60 bg-card/40">

                <CardHeader className="pb-3">

                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">

                    <FileText className="h-4 w-4 text-primary" />

                    Contract summary

                  </CardTitle>

                </CardHeader>

                <CardContent className="space-y-3 text-sm">

                  {summary?.overview && (

                    <p className="leading-relaxed text-muted-foreground">{summary.overview}</p>

                  )}

                  <SummaryRow label="Parties" value={summary?.parties?.join(", ")} />

                  <SummaryRow label="Effective date" value={summary?.effectiveDate} />

                  <SummaryRow label="Expiration" value={summary?.expirationDate} />

                  <SummaryRow label="Payment terms" value={summary?.paymentTerms} />

                  <SummaryRow label="Renewal" value={summary?.renewalTerms} />

                  <SummaryRow label="Governing law" value={summary?.governingLaw} />

                </CardContent>

              </Card>



              <Card className="border-border/60 bg-card/40">

                <CardHeader className="pb-3">

                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">

                    <Shield className="h-4 w-4 text-primary" />

                    Missing clauses

                  </CardTitle>

                </CardHeader>

                <CardContent>

                  {missing.length === 0 ? (

                    <div className="flex items-center gap-2 text-sm text-emerald-400">

                      <CheckCircle2 className="h-4 w-4" />

                      No critical missing clauses detected

                    </div>

                  ) : (

                    <div className="space-y-2">

                      {missing.map((item, i) => (

                        <div

                          key={i}

                          className="rounded-lg border border-border/50 bg-background/40 p-3"

                        >

                          <div className="flex items-center gap-2">

                            <p className="text-xs font-semibold">{item.name}</p>

                            <Badge variant="outline" className="text-[10px]">

                              {item.importance}

                            </Badge>

                          </div>

                          <p className="mt-1 text-[11px] text-muted-foreground">

                            {item.description}

                          </p>

                        </div>

                      ))}

                    </div>

                  )}

                </CardContent>

              </Card>

            </div>



            {timeline.length > 0 && (

              <Card className="border-border/60 bg-card/40">

                <CardHeader className="pb-3">

                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">

                    <Calendar className="h-4 w-4 text-primary" />

                    Contract timeline

                  </CardTitle>

                </CardHeader>

                <CardContent>

                  <div className="space-y-2">

                    {timeline.map((event, i) => (

                      <div

                        key={i}

                        className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/30 p-3"

                      >

                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="text-sm font-medium">{event.label}</p>

                            <Badge

                              variant="outline"

                              className={cn(

                                "text-[10px] capitalize",

                                timelineTypeStyles[event.type] ?? timelineTypeStyles.other

                              )}

                            >

                              {event.type}

                            </Badge>

                          </div>

                          <p className="mt-0.5 text-xs text-muted-foreground">

                            {event.date}

                            {event.party ? ` · ${event.party}` : ""}

                          </p>

                          {event.description && (

                            <p className="mt-1 text-[11px] text-muted-foreground">

                              {event.description}

                            </p>

                          )}

                        </div>

                      </div>

                    ))}

                  </div>

                </CardContent>

              </Card>

            )}

          </TabsContent>



          <TabsContent value="agents" className="mt-4">

            {visitedTabs.has("agents") ? (

              <DocumentAgentsTab

                documentId={documentId}

                documentReady={document.status === "ready"}

              />

            ) : null}

          </TabsContent>



          <TabsContent value="risks" className="mt-4">

            <Card className="border-border/60 bg-card/40">

              <CardHeader className="pb-3">

                <CardTitle className="flex items-center gap-2 text-sm font-semibold">

                  <AlertTriangle className="h-4 w-4 text-primary" />

                  Risk scanner — {risks.length} item{risks.length !== 1 ? "s" : ""} found

                </CardTitle>

              </CardHeader>

              <CardContent>

                {risks.length === 0 ? (

                  <p className="text-sm text-muted-foreground">

                    No significant risks identified in this document.

                  </p>

                ) : (

                  <div className="space-y-3">

                    {risks.map((risk, i) => (

                      <div

                        key={i}

                        className="rounded-xl border border-border/50 bg-background/30 p-4"

                      >

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <div className="flex flex-wrap items-center gap-2">

                            <Badge

                              variant="outline"

                              className={cn(

                                "text-[10px] capitalize",

                                severityStyles[risk.severity]

                              )}

                            >

                              {risk.severity} risk

                            </Badge>

                            <p className="text-sm font-semibold">{risk.title}</p>

                          </div>

                          <Button

                            size="sm"

                            variant="outline"

                            className="h-7 gap-1 text-[11px]"

                            onClick={() => explainRisk(risk)}

                          >

                            <BookOpen className="h-3 w-3" />

                            Explain

                          </Button>

                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">

                          {risk.description}

                        </p>

                        {risk.clause && (

                          <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-[11px] italic text-muted-foreground">

                            {risk.clause}

                          </blockquote>

                        )}

                      </div>

                    ))}

                  </div>

                )}

              </CardContent>

            </Card>

          </TabsContent>



          <TabsContent value="obligations" className="mt-4">

            <Card className="border-border/60 bg-card/40">

              <CardHeader className="pb-3">

                <CardTitle className="flex items-center gap-2 text-sm font-semibold">

                  <ListChecks className="h-4 w-4 text-primary" />

                  Obligation tracker

                </CardTitle>

              </CardHeader>

              <CardContent>

                {obligations.length === 0 ? (

                  <p className="text-sm text-muted-foreground">

                    No structured obligations extracted. Try re-analyzing this document.

                  </p>

                ) : (

                  <div className="overflow-x-auto">

                    <div className="min-w-[640px]">

                      <div className="grid grid-cols-[1fr_2fr_1fr_100px] gap-3 border-b border-border/50 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">

                        <span>Party</span>

                        <span>Obligation</span>

                        <span>Due date</span>

                        <span>Type</span>

                      </div>

                      <div className="divide-y divide-border/40">

                        {obligations.map((item, i) => (

                          <div

                            key={i}

                            className="grid grid-cols-[1fr_2fr_1fr_100px] gap-3 py-3 text-sm"

                          >

                            <span className="font-medium">{item.party}</span>

                            <div>

                              <p className="text-xs leading-relaxed text-muted-foreground">

                                {item.description}

                              </p>

                              {item.clause && (

                                <p className="mt-1 text-[10px] italic text-muted-foreground/80">

                                  &ldquo;{item.clause.slice(0, 120)}

                                  {item.clause.length > 120 ? "…" : ""}&rdquo;

                                </p>

                              )}

                            </div>

                            <span className="text-xs text-muted-foreground">

                              {item.dueDate || "Not specified"}

                            </span>

                            <Badge

                              variant="outline"

                              className={cn(

                                "w-fit text-[10px] capitalize",

                                obligationTypeStyles[item.type] ?? obligationTypeStyles.other

                              )}

                            >

                              {item.type}

                            </Badge>

                          </div>

                        ))}

                      </div>

                    </div>

                  </div>

                )}

              </CardContent>

            </Card>

          </TabsContent>



          <TabsContent value="compare" className="mt-4">

            {visitedTabs.has("compare") ? (

              <DocumentCompareTab

                documentId={documentId}

                documentReady={document.status === "ready"}

              />

            ) : null}

          </TabsContent>



          <TabsContent value="chat" className="mt-4">

            {visitedTabs.has("chat") ? (

              <DocumentChatTab

                key={chatSeed?.key ?? "default"}

                documentId={documentId}

                documentTitle={document.title}

                initialQuestion={chatSeed?.question}

                initialMode={chatSeed?.mode}

              />

            ) : null}

          </TabsContent>

        </Tabs>

      )}

    </div>

  )

}



function ScoreCard({

  label,

  value,

  suffix,

  level,

}: {

  label: string

  value: number | string

  suffix?: string

  level?: string | null

}) {

  return (

    <Card className="border-border/60 bg-card/40">

      <CardContent className="p-4">

        <p className="text-xs text-muted-foreground">{label}</p>

        <p className="mt-1 text-3xl font-bold leading-none">

          {value}

          {suffix && (

            <span className="text-base font-normal text-muted-foreground">{suffix}</span>

          )}

        </p>

        {level && (

          <Badge

            variant="outline"

            className={cn("mt-2 text-[10px] capitalize", riskLevelStyles[level as keyof typeof riskLevelStyles])}

          >

            {level} overall

          </Badge>

        )}

      </CardContent>

    </Card>

  )

}



function CountCard({

  label,

  value,

  color,

}: {

  label: string

  value: number

  color: string

}) {

  return (

    <Card className="border-border/60 bg-card/40">

      <CardContent className="p-4">

        <p className="text-xs text-muted-foreground">{label}</p>

        <p className={cn("mt-1 text-3xl font-bold leading-none", color)}>{value}</p>

      </CardContent>

    </Card>

  )

}



function SummaryRow({ label, value }: { label: string; value?: string | null }) {

  if (!value) return null

  return (

    <div>

      <p className="text-xs font-medium text-foreground">{label}</p>

      <p className="text-xs text-muted-foreground">{value}</p>

    </div>

  )

}

