"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { invalidateDashboard } from "@/hooks/query-utils"
import Link from "next/link"
import {
  Upload,
  FileText,
  Loader2,
  X,
  CheckCircle2,
  Shield,
  Sparkles,
  FileType,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const steps = [
  {
    icon: Upload,
    title: "Upload file",
    description: "PDF or DOCX up to 10MB",
  },
  {
    icon: Sparkles,
    title: "AI processes",
    description: "Parse, chunk & embed clauses",
  },
  {
    icon: CheckCircle2,
    title: "Ready to chat",
    description: "Ask questions in plain English",
  },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function fileTypeLabel(file: File) {
  if (file.type.includes("pdf") || file.name.endsWith(".pdf")) return "PDF"
  return "DOCX"
}

export function UploadPanel() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const assignFile = useCallback(
    (selected: File) => {
      setFile(selected)
      if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""))
    },
    [title]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) assignFile(dropped)
    },
    [assignFile]
  )

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a file")
      return
    }
    if (!title.trim()) {
      toast.error("Please enter a document title")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success("Document uploaded! Processing started.")
      await invalidateDashboard(queryClient)
      router.push("/dashboard/documents")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
          Upload Document
        </h1>
        <p className="mt-1.5 text-sm leading-normal text-muted-foreground">
          Add contracts to your library — PactMind will index every clause for AI
          Q&amp;A
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main upload card */}
        <Card className="border-border/60 bg-card/40 lg:col-span-2">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Document title
              </Label>
              <Input
                id="title"
                placeholder="e.g. NDA — TechCorp 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 bg-background/60"
              />
              <p className="text-[11px] text-muted-foreground">
                A clear title helps you find this contract later
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT}
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (selected) assignFile(selected)
                e.target.value = ""
              }}
            />

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition-all",
                  dragging
                    ? "border-primary bg-primary/10 shadow-[0_0_0_4px_rgba(20,184,166,0.15)]"
                    : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                    dragging
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/15 text-primary group-hover:bg-primary/25"
                  )}
                >
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Drag &amp; drop your file here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click anywhere to browse
                </p>
                <div className="mt-5 flex gap-2">
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 text-[11px] text-blue-400"
                  >
                    PDF
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-purple-500/30 text-[11px] text-purple-400"
                  >
                    DOCX
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] text-muted-foreground"
                  >
                    Max 10 MB
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {file.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {fileTypeLabel(file)}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatSize(file.size)}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setFile(null)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="mt-3 text-xs font-medium text-primary hover:underline"
                      disabled={uploading}
                    >
                      Replace file
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                className="w-full sm:w-auto sm:min-w-[200px]"
                disabled={!file || !title.trim() || uploading}
                onClick={handleUpload}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading &amp; processing…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload &amp; Process
                  </>
                )}
              </Button>
              <Link
                href="/dashboard/documents"
                className="inline-flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                View existing documents
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/40">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold leading-tight text-foreground">
                How it works
              </h3>
              <div className="mt-4 space-y-4">
                {steps.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <div key={step.title} className="flex gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        {i < steps.length - 1 && (
                          <div className="mt-1 h-full w-px flex-1 bg-border/60" />
                        )}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-semibold text-foreground">
                          {i + 1}. {step.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/40">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Secure upload
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Files are stored in encrypted cloud storage. Only you can access
                your documents.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/40">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <FileType className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Supported formats
                </h3>
              </div>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  PDF — contracts, agreements, legal letters
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  DOCX — Word documents &amp; templates
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
