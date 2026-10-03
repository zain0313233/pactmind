"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { ChatMessageBubble } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { PACTMIND_NAME, PACTMIND_WELCOME } from "@/lib/pactmind"
import type { QueryMode, QueryConfidence } from "@/lib/pactmind"
import { streamDocumentQuery } from "@/lib/query-stream"
import { useAuth } from "@/contexts/auth-provider"
import {
  createStreamReplyHandlers,
  STREAM_STATUS,
} from "@/lib/streaming-chat-reply"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/components/chat/types"

type DocumentChatTabProps = {
  documentId: string
  documentTitle: string
  initialQuestion?: string
  initialMode?: QueryMode
  onQuestionSent?: () => void
}

function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function DocumentChatTab({
  documentId,
  documentTitle,
  initialQuestion,
  initialMode = "conversational",
  onQuestionSent,
}: DocumentChatTabProps) {
  const { refreshUser } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      type: "text",
      content: PACTMIND_WELCOME(documentTitle),
      time: now(),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [plainEnglish, setPlainEnglish] = useState(initialMode === "plain_english")
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(
    initialQuestion ?? null
  )

  const sendText = useCallback(
    async (question: string, mode: QueryMode = plainEnglish ? "plain_english" : "conversational") => {
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        type: "text",
        content: question,
        time: now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      const assistantId = uid()
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          type: "text",
          content: STREAM_STATUS.analyzing,
          streaming: true,
          time: now(),
        },
      ])

      try {
        let sources: ChatMessage["sources"]
        let confidence: QueryConfidence | undefined

        const reply = createStreamReplyHandlers({
          onUpdate: (content, streaming) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content, streaming } : m
              )
            )
          },
          onSources: (s) => {
            sources = s as ChatMessage["sources"]
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, sources: s as ChatMessage["sources"] } : m
              )
            )
          },
          onDone: (c) => {
            confidence = c as QueryConfidence
          },
          onAccessRestricted: () => {
            void refreshUser()
          },
          onWarning: (text) => {
            toast.warning(text)
          },
        })

        await streamDocumentQuery(documentId, question, mode, reply.handlers)

        const finalText = reply.finalize()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: finalText || m.content || "No answer received.",
                  sources: sources ?? m.sources,
                  confidence: confidence ?? m.confidence,
                  streaming: false,
                }
              : m
          )
        )
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: err instanceof Error ? err.message : "Something went wrong",
                  streaming: false,
                }
              : m
          )
        )
      } finally {
        setLoading(false)
        onQuestionSent?.()
      }
    },
    [documentId, plainEnglish, onQuestionSent]
  )

  useEffect(() => {
    if (pendingQuestion) {
      const q = pendingQuestion
      setPendingQuestion(null)
      void sendText(q, initialMode)
    }
  }, [pendingQuestion, sendText, initialMode])

  return (
    <div className="flex h-[min(520px,60vh)] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/40">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          Ask {PACTMIND_NAME} about this contract
        </p>
        <button
          type="button"
          onClick={() => setPlainEnglish((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            plainEnglish
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
          )}
        >
          <BookOpen className="h-3 w-3" />
          Plain English
        </button>
      </div>

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10">
        <div className="space-y-4 p-4">
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
          {loading && !messages.some((m) => m.streaming) && (
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                CM
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {plainEnglish ? "Simplifying in plain English…" : `${PACTMIND_NAME} is analyzing…`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <ChatInput
        disabled={loading}
        loading={loading}
        onSendText={(text) => sendText(text)}
        onSendImage={() => {}}
        onSendVoice={() => {}}
        />
      </div>
    </div>
  )
}
