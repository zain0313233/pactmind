import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  MessageSquare,
  Shield,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            AI-powered legal document analysis
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Understand contracts{" "}
            <span className="text-primary">10x faster</span> with PactMind
          </h1>

          <p className="max-w-lg text-lg text-muted-foreground">
            Upload NDAs, service agreements, and employment contracts. Ask
            questions in plain English and get instant, accurate answers backed
            by your document.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              View dashboard
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {[
              "PDF & DOCX support",
              "Secure cloud storage",
              "RAG-powered answers",
              "Real-time chat",
            ].map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <Card className="overflow-hidden border-border/50 shadow-2xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
                <div className="mb-4 flex items-center gap-2">
                  <FileSearch className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">
                    Contract Analysis Live
                  </span>
                </div>
                <div className="space-y-3 rounded-lg bg-white/5 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
                      U
                    </div>
                    <div className="rounded-lg bg-white/10 px-3 py-2 text-sm">
                      What is the termination notice period?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      AI
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
                      Per Section 8.2, either party may terminate with 30 days
                      written notice. Early termination incurs a penalty of 2
                      months&apos; fees.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="absolute -bottom-4 -left-4 border-border/50 shadow-lg">
            <CardContent className="flex items-center gap-3 p-4">
              <Shield className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold">+98% accuracy</p>
                <p className="text-xs text-muted-foreground">
                  Context-grounded answers
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="absolute -right-4 -top-4 border-border/50 shadow-lg">
            <CardContent className="flex items-center gap-3 p-4">
              <MessageSquare className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-semibold">Instant Q&A</p>
                <p className="text-xs text-muted-foreground">
                  Ask anything about clauses
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
