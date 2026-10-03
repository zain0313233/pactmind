"use client"

import { useRef, useState } from "react"
import {
  FileText,
  Loader2,
  Shield,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PACTMIND_NAME } from "@/lib/pactmind"
import { cn } from "@/lib/utils"
import {
  useDeleteTemplateMutation,
  useTemplatesQuery,
  useUploadTemplateMutation,
} from "@/hooks/use-templates-query"
import { TEMPLATE_TYPES } from "@/types/comparison"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function typeLabel(value: string) {
  return TEMPLATE_TYPES.find((t) => t.value === value)?.label ?? value
}

export function StandardsPanel() {
  const { data: templates = [], isLoading: loading } = useTemplatesQuery()
  const uploadMutation = useUploadTemplateMutation()
  const deleteMutation = useDeleteTemplateMutation()
  const [name, setName] = useState("")
  const [type, setType] = useState("nda")
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploading = uploadMutation.isPending

  async function uploadFile(file: File) {
    if (!name.trim()) {
      toast.error("Enter a template name first")
      return
    }

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name.trim())
      formData.append("type", type)

      await uploadMutation.mutateAsync(formData)
      toast.success("Gold standard template uploaded")
      setName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Template deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Standard templates
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upload gold-standard contracts. {PACTMIND_NAME} compares new documents
          against them and flags deviations.
        </p>
      </div>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                placeholder="e.g. Company NDA v3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-type">Contract type</Label>
              <select
                id="template-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) void uploadFile(file)
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadFile(file)
              }}
            />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
            <p className="mt-3 text-sm font-medium">
              Drop your gold-standard contract here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PDF or DOCX, max 10MB</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Your templates</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Shield className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No standard templates yet. Upload your first gold-standard contract.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel(tpl.type)} · {formatSize(tpl.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {typeLabel(tpl.type)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(tpl.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
