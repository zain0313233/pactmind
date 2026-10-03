"use client"

import { useRef, useState, useEffect } from "react"
import Image from "next/image"
import { Paperclip, Mic, Send, Square, X } from "lucide-react"
import { CHAT_LEGAL_DISCLAIMER, PACTMIND_USAGE_POLICY } from "@/lib/access-policy"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PendingImage = {
  file: File
  previewUrl: string
}

type ChatInputProps = {
  disabled?: boolean
  loading?: boolean
  onSendText: (text: string) => void
  onSendImage: (file: File, caption: string) => void
  onSendVoice: (duration: string) => void
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function ChatInput({
  disabled,
  loading,
  onSendText,
  onSendImage,
  onSendVoice,
}: ChatInputProps) {
  const [text, setText] = useState("")
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pendingImage])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return

    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage({
      file,
      previewUrl: URL.createObjectURL(file),
    })
    e.target.value = ""
  }

  function clearPendingImage() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
  }

  function startRecording() {
    setIsRecording(true)
    setRecordSeconds(0)
    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1)
    }, 1000)
  }

  function stopRecording(send: boolean) {
    if (timerRef.current) clearInterval(timerRef.current)
    const duration = formatDuration(recordSeconds)
    setIsRecording(false)
    setRecordSeconds(0)
    if (send) onSendVoice(duration)
  }

  function handleSend() {
    if (pendingImage) {
      onSendImage(pendingImage.file, text.trim())
      clearPendingImage()
      setText("")
      return
    }
    if (!text.trim()) return
    onSendText(text.trim())
    setText("")
  }

  const canSend =
    !disabled &&
    !loading &&
    !isRecording &&
    (text.trim().length > 0 || pendingImage !== null)

  return (
    <div className="shrink-0 border-t border-border/60 bg-card/40 px-4 py-3">
      {pendingImage && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-2">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={pendingImage.previewUrl}
              alt="Attachment preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="flex-1 truncate text-xs text-muted-foreground">
            {pendingImage.file.name}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clearPendingImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="flex-1 text-sm font-medium text-red-400">
            Recording… {formatDuration(recordSeconds)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => stopRecording(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-red-500 hover:bg-red-600"
            onClick={() => stopRecording(true)}
          >
            <Square className="h-3 w-3 fill-current" />
            Send
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
            disabled={disabled || loading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
            disabled={disabled || loading}
            onClick={startRecording}
          >
            <Mic className="h-4 w-4" />
          </Button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            rows={1}
            disabled={disabled || loading}
            className={cn(
              "max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm leading-normal outline-none",
              "placeholder:text-muted-foreground disabled:opacity-50"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <Button
            type="button"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            disabled={!canSend}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        {PACTMIND_USAGE_POLICY} {CHAT_LEGAL_DISCLAIMER}
      </p>
    </div>
  )
}
