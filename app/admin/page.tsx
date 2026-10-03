"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Users, FileText, MessageSquare, AlertTriangle, ShieldAlert } from "lucide-react"
import { fetchJson } from "@/lib/api-client"
import { useAdminAccessAlerts } from "@/hooks/use-admin-access-alerts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminDashboardCharts } from "@/components/admin/admin-charts"

type PlatformStats = {
  users: { total: number; verified: number; unverified: number; admins: number }
  documents: {
    total: number
    ready: number
    processing: number
    failed: number
  }
  analyses: { total: number; highRisk: number }
  chat: { conversations: number; userMessages: number }
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    role: string
    emailVerified: boolean
    createdAt: string
  }>
  recentDocuments: Array<{
    id: string
    title: string
    status: string
    ownerEmail: string
    riskLevel: string | null
    createdAt: string
  }>
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: number
  sub: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-4 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => fetchJson<{ stats: PlatformStats }>("/api/platform/stats"),
  })
  const { data: alertsData } = useAdminAccessAlerts(true)
  const pendingUnblock = alertsData?.alerts.pendingUnblockCount ?? 0
  const securityBlocked = alertsData?.alerts.securityBlockedDocuments ?? 0

  const stats = data?.stats

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load stats"}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All users, documents, and activity across PactMind
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {pendingUnblock > 0 && (
        <Link
          href="/admin/users?needsAction=1"
          className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 transition-colors hover:bg-amber-500/15"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-amber-100">
                {pendingUnblock} unblock request{pendingUnblock === 1 ? "" : "s"} pending
              </p>
              <p className="text-sm text-amber-200/80">
                Users are waiting for admin review — this stays visible until resolved.
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-amber-300">Review users →</span>
        </Link>
      )}

      {securityBlocked > 0 && (
        <Link
          href="/admin/documents?status=rejected"
          className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 transition-colors hover:bg-red-500/15"
        >
          <div>
            <p className="font-semibold text-red-100">
              {securityBlocked} document{securityBlocked === 1 ? "" : "s"} blocked by security scan
            </p>
            <p className="text-sm text-red-200/80">Review flagged uploads in All Documents.</p>
          </div>
          <span className="text-sm font-medium text-red-300">Review documents →</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.users.total}
          sub={`${stats.users.verified} verified · ${stats.users.admins} admins`}
          icon={Users}
        />
        <StatCard
          label="Documents"
          value={stats.documents.total}
          sub={`${stats.documents.ready} ready · ${stats.documents.failed} failed`}
          icon={FileText}
        />
        <StatCard
          label="Chat messages"
          value={stats.chat.userMessages}
          sub={`${stats.chat.conversations} conversations`}
          icon={MessageSquare}
        />
        <StatCard
          label="High-risk analyses"
          value={stats.analyses.highRisk}
          sub={`${stats.analyses.total} analyses complete`}
          icon={AlertTriangle}
        />
      </div>

      <AdminDashboardCharts />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Recent signups</CardTitle>
            <Link
              href="/admin/users"
              className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentUsers.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{u.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {u.role}
                  </Badge>
                  {!u.emailVerified && (
                    <Badge variant="outline" className="text-[10px] text-amber-400">
                      unverified
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Recent uploads</CardTitle>
            <Link
              href="/admin/documents"
              className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentDocuments.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.ownerEmail}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {d.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
