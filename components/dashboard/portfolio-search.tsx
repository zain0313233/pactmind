"use client"

import { useState } from "react"
import { Loader2, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PACTMIND_NAME } from "@/lib/pactmind"
import { cn } from "@/lib/utils"
import type { PortfolioSource, QueryConfidence } from "@/lib/pactmind"

const confidenceStyles: Record<QueryConfidence, string> = {
  high: "border-emerald-500/30 text-emerald-400",
  medium: "border-amber-500/30 text-amber-400",
  low: "border-red-500/30 text-red-400",
}

const SUGGESTIONS = [
  "Which contracts expire in the next 60 days?",
  "Show contracts with unlimited liability",
  "List all payment obligations across contracts",
  "Which NDAs have confidentiality gaps?",
]

export function PortfolioSearch() {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<QueryConfidence | null>(null)
  const [sources, setSources] = useState<PortfolioSource[]>([])
  const [searched, setSearched] = useState(0)

  async function handleSearch(q?: string) {
    const text = (q ?? question).trim()
    if (!text) return

    setQuestion(text)
    setLoading(true)
    setAnswer(null)

    try {
      const res = await fetch("/api/query/portfolio", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAnswer(data.answer)
      setConfidence(data.confidence)
      setSources(data.sources || [])
      setSearched(data.documentsSearched ?? 0)
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "Search failed")
      setConfidence("low")
      setSources([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="gap-1 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold leading-tight tracking-tight">
            Portfolio search
          </h3>
        </div>
        <p className="text-xs leading-tight text-muted-foreground">
          Ask {PACTMIND_NAME} across all your contracts at once
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder='e.g. "Show contracts expiring in 60 days"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9 text-sm"
            disabled={loading}
          />
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={loading || !question.trim()}
            onClick={() => handleSearch()}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Search
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => handleSearch(s)}
              className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching {PACTMIND_NAME} across your portfolio…
          </div>
        )}

        {answer && !loading && (
          <div className="space-y-3 rounded-xl border border-border/50 bg-background/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-primary">{PACTMIND_NAME}</span>
              {confidence && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px] capitalize", confidenceStyles[confidence])}
                >
                  {confidence} confidence
                </Badge>
              )}
              {searched > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Searched {searched} contract{searched !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>

            {sources.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-primary">
                  {sources.length} source excerpt{sources.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {sources.slice(0, 5).map((s, i) => (
                    <div
                      key={`${s.documentId}-${s.chunkIndex}-${i}`}
                      className="rounded border border-border/40 bg-muted/20 p-2"
                    >
                      <p className="font-medium text-foreground">{s.documentTitle}</p>
                      <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                        {s.content}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
