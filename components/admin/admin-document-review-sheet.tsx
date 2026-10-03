"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileText,
  MessageSquareOff,
  MessageSquare,
} from "lucide-react"
import { toast } from "sonner"
import { fetchJson } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export type AdminDocumentDetail = {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  status: string
  contractType: string | null
  contentReviewStatus: string
  contentReviewNotes: Record<string, unknown> | null
  contentReviewedAt: string | null
  queriesEnabled: boolean
  createdAt: string
  owner: { id: string; email: string; name: string | null }
  riskLevel: string | null
  previewText: string
  chunkCount: number
  conversationCount: number
}

type ContentReviewResult = {
  status: string
  summary?: string
  is_legal_document?: boolean | null
  confidence?: string
  issues?: string[]
  security_risks?: string[]
  recommendation?: string
  admin_message?: string
}

type AdminDocumentReviewSheetProps = {
  documentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

function reviewBadge(status: string) {
  if (status === "valid")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
        <ShieldCheck className="mr-1 h-3 w-3" />
        Valid
      </Badge>
    )
  if (status === "suspicious")
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
        <ShieldAlert className="mr-1 h-3 w-3" />
        Suspicious
      </Badge>
    )
  if (status === "rejected")
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
        <ShieldX className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    )
  return (
    <Badge variant="outline">
      <Shield className="mr-1 h-3 w-3" />
      Pending review
    </Badge>
  )
}

export function AdminDocumentReviewSheet({
  documentId,
  open,
  onOpenChange,
  onUpdated,
}: AdminDocumentReviewSheetProps) {
  const queryClient = useQueryClient()
  const [reviewing, setReviewing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [lastReview, setLastReview] = useState<ContentReviewResult | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "document", documentId],
    queryFn: () =>
      fetchJson<{ document: AdminDocumentDetail }>(
        `/api/platform/documents/${documentId}`
      ),
    enabled: open && !!documentId,
  })

  const doc = data?.document

  async function runPactMindReview() {
    if (!documentId) return
    setReviewing(true)
    try {
      const res = await fetchJson<{
        document: AdminDocumentDetail
        review: ContentReviewResult
      }>(`/api/platform/documents/${documentId}/review`, { method: "POST" })
      setLastReview(res.review)
      toast.success("PactMind content review complete")
      void refetch()
      void queryClient.invalidateQueries({ queryKey: ["admin", "documents"] })
      onUpdated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed")
    } finally {
      setReviewing(false)
    }
  }

  async function setStatus(
    status: "valid" | "suspicious" | "rejected",
    queriesEnabled?: boolean
  ) {
    if (!documentId) return
    setUpdating(true)
    try {
      await fetchJson(`/api/platform/documents/${documentId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(queriesEnabled !== undefined
            ? { queries_enabled: queriesEnabled }
            : {}),
        }),
      })
      toast.success(`Marked as ${status}`)
      void refetch()
      void queryClient.invalidateQueries({ queryKey: ["admin", "documents"] })
      onUpdated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setUpdating(false)
    }
  }

  const notes = (lastReview ??
    (doc?.contentReviewNotes as ContentReviewResult | null)) as ContentReviewResult | null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-8">{doc?.title ?? "Document review"}</SheetTitle>
          <SheetDescription>
            Preview uploaded content and run PactMind security / validity checks
            before users consume AI tokens.
          </SheetDescription>
        </SheetHeader>

        {isLoading || !doc ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {reviewBadge(doc.contentReviewStatus)}
              <Badge variant="outline">{doc.status}</Badge>
              {doc.riskLevel && (
                <Badge variant="outline">Risk: {doc.riskLevel}</Badge>
              )}
              {doc.queriesEnabled ? (
                <Badge className="bg-emerald-500/10 text-emerald-400">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  Chat enabled
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-400">
                  <MessageSquareOff className="mr-1 h-3 w-3" />
                  Chat blocked
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Owner:{" "}
                <Link
                  href={`/admin/users/${doc.owner.id}`}
                  className="text-primary hover:underline"
                >
                  {doc.owner.email}
                </Link>
              </p>
              <p className="mt-1">
                {doc.chunkCount} chunks · {doc.conversationCount} conversations
              </p>
            </div>

            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  Document preview
                </div>
                <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  {doc.previewText.trim() ||
                    "No text extracted yet — wait for processing to finish."}
                </pre>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => void runPactMindReview()}
                disabled={reviewing || doc.status !== "ready"}
              >
                {reviewing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Run PactMind security check
              </Button>
              {doc.status !== "ready" && (
                <p className="text-xs text-muted-foreground">
                  Document must finish processing before AI review can run.
                </p>
              )}
            </div>

            {notes && (
              <Card className="border-border/60">
                <CardContent className="space-y-3 p-4 text-sm">
                  <p className="font-medium">PactMind assessment</p>
                  {notes.summary && (
                    <p className="text-muted-foreground">{notes.summary}</p>
                  )}
                  {notes.admin_message && (
                    <p className="text-xs text-amber-400/90">{notes.admin_message}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {notes.is_legal_document !== undefined && (
                      <Badge variant="outline">
                        Legal doc: {notes.is_legal_document ? "yes" : "no"}
                      </Badge>
                    )}
                    {notes.confidence && (
                      <Badge variant="outline">Confidence: {notes.confidence}</Badge>
                    )}
                    {notes.recommendation && (
                      <Badge variant="outline">{notes.recommendation}</Badge>
                    )}
                  </div>
                  {notes.issues && notes.issues.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Issues
                      </p>
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {notes.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {notes.security_risks && notes.security_risks.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-red-400">
                        Security risks
                      </p>
                      <ul className="list-inside list-disc text-xs text-red-400/80">
                        {notes.security_risks.map((risk) => (
                          <li key={risk}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Admin actions</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  onClick={() => void setStatus("valid", true)}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  onClick={() => void setStatus("suspicious", true)}
                >
                  Flag suspicious
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={updating}
                  onClick={() => void setStatus("rejected", false)}
                >
                  Block chat
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Blocking chat stops PactMind from answering on this document —
                protecting AI tokens from joke or malicious uploads.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
