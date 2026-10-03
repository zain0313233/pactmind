"use client"

import Link from "next/link"
import { RefreshCw, FileText, Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCards } from "@/components/dashboard/stat-cards"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines"
import { PortfolioSearch } from "@/components/dashboard/portfolio-search"
import {
  RECENT_DOCUMENTS_LIMIT,
  useDocumentsQuery,
} from "@/hooks/use-documents-query"
import { invalidateDashboard } from "@/hooks/query-utils"
import { useStatsQuery } from "@/hooks/use-stats-query"
import { cn } from "@/lib/utils"

type RecentDocument = {
  id: string
  title: string
  status: string
  fileType: string
  createdAt: string
  analysis?: { riskScore: number | null; riskLevel: string | null; status: string } | null
}

export default function DashboardPage() {
  const queryClient = useQueryClient()

  const {
    data: stats = { total: 0, ready: 0, queries: 0, risky: 0 },
    isLoading: statsLoading,
  } = useStatsQuery()

  const {
    data: docsData,
    isLoading: docsLoading,
    isFetching: docsFetching,
  } = useDocumentsQuery({
    page: 1,
    limit: RECENT_DOCUMENTS_LIMIT,
    search: "",
    status: "all",
    portfolio: "all",
  })

  const documents = (docsData?.documents ?? []) as RecentDocument[]
  const loading = statsLoading || docsLoading
  const refreshing = docsFetching && !docsLoading

  async function handleRefresh() {
    await invalidateDashboard(queryClient)
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white">
              Welcome to PactMind
            </h1>
            <p className="mt-1.5 text-sm leading-normal text-primary-foreground/80 text-white">
              PactMind analyzes your contracts — risks, summaries, and Q&amp;A
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-fit bg-primary-foreground/15 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/25 text-white"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <StatCards stats={stats} />
      <PortfolioSearch />
      <UpcomingDeadlines />
      <DashboardCharts />
      <QuickActions />

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold leading-tight tracking-tight">
              Recent Documents
            </h2>
            <Link
              href="/dashboard/documents"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload your first contract to get started.
              </p>
              <Link
                href="/dashboard/upload"
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Upload document →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileType.includes("pdf") ? "PDF" : "DOCX"}
                        {doc.analysis?.status === "ready" && doc.analysis.riskScore != null && (
                          <> · Risk score {doc.analysis.riskScore}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        doc.status === "ready"
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-amber-500/30 text-amber-400"
                      }
                    >
                      {doc.status}
                    </Badge>
                    {doc.status === "ready" && (
                      <>
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="rounded-md border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary"
                        >
                          Report
                        </Link>
                        <Link
                          href={`/chat/${doc.id}`}
                          className="rounded-md border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary"
                        >
                          Ask AI
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
