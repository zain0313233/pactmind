"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  MessageSquare,
  Loader2,
  X,
  ArrowLeft,
  FileText,
  Sparkles,
  AlertCircle,
  BookOpen,
  FileSearch,
  Languages,
} from "lucide-react"
import { toast } from "sonner"
import { useSidebar } from "@/components/layout/sidebar-context"
import { Button } from "@/components/ui/button"
import { ChatInbox } from "./chat-inbox"
import { ChatMessageBubble } from "./chat-message"
import { ChatInput } from "./chat-input"
import {
  PACTMIND_NAME,
  PACTMIND_TAGLINE,
  PACTMIND_WELCOME,
  type QueryConfidence,
  type QuerySource,
} from "@/lib/pactmind"
import { streamDocumentQuery } from "@/lib/query-stream"
import { useAuth } from "@/contexts/auth-provider"
import {
  createStreamReplyHandlers,
  STREAM_STATUS,
} from "@/lib/streaming-chat-reply"
import { cn } from "@/lib/utils"
import {
  useDocumentPolling,
  useSingleDocumentPolling,
} from "@/hooks/use-document-polling"
import { useRealtimeDocumentRefresh } from "@/hooks/use-realtime-stream"
import { useAllDocumentsQuery } from "@/hooks/use-all-documents-query"
import { queryKeys } from "@/lib/query-keys"
import type { ChatDocument, ChatMessage } from "./types"

const WELCOME_MESSAGE = (title: string): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  type: "text",
  content: PACTMIND_WELCOME(title),
  time: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
})

const quickActions = [
  { label: "Termination clause", icon: AlertCircle },
  { label: "Payment terms", icon: BookOpen },
  { label: "Liability limits", icon: FileSearch },
  { label: "Key obligations", icon: Sparkles },
]

function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

type ChatWorkspaceProps = {
  initialDocumentId?: string
}

export function ChatWorkspace({ initialDocumentId }: ChatWorkspaceProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()
  const { isMobile } = useSidebar()
  const {
    data: documents = [],
    isLoading: loadingDocs,
    refetch: refetchDocuments,
  } = useAllDocumentsQuery()
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocumentId ?? null
  )
  const [messagesByDoc, setMessagesByDoc] = useState<
    Record<string, ChatMessage[]>
  >({})
  const [loading, setLoading] = useState(false)
  const [plainEnglish, setPlainEnglish] = useState(false)
  const [inboxWidth, setInboxWidth] = useState(320)
  const [inboxCollapsed, setInboxCollapsed] = useState(false)
  const [inboxHydrated, setInboxHydrated] = useState(false)
  const resizingInbox = useRef(false)
  const splitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem("pactmind-inbox-collapsed")
    if (stored === "true") setInboxCollapsed(true)
    setInboxHydrated(true)
  }, [])

  useEffect(() => {
    if (!inboxHydrated) return
    localStorage.setItem("pactmind-inbox-collapsed", String(inboxCollapsed))
  }, [inboxCollapsed, inboxHydrated])

  const toggleInbox = useCallback(() => {
    setInboxCollapsed((prev) => !prev)
  }, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingInbox.current || !splitRef.current || inboxCollapsed) return
      const left = splitRef.current.getBoundingClientRect().left
      setInboxWidth(Math.min(520, Math.max(220, e.clientX - left)))
    }
    function onUp() {
      resizingInbox.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [inboxCollapsed])

  const hasProcessing = documents.some(
    (d) => d.status === "processing" || d.status === "pending"
  )

  useDocumentPolling(
    documents,
    () => {
      void refetchDocuments()
    },
    hasProcessing
  )

  useRealtimeDocumentRefresh(hasProcessing, () => {
    void refetchDocuments()
  })

  useEffect(() => {
    if (initialDocumentId) setSelectedId(initialDocumentId)
  }, [initialDocumentId])

  const loadConversation = useCallback(async (docId: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${docId}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.messages?.length) {
        setMessagesByDoc((prev) => ({
          ...prev,
          [docId]: [WELCOME_MESSAGE(title)],
        }))
        return
      }

      const loaded: ChatMessage[] = data.messages.map(
        (m: {
          id: string
          role: string
          content: string
          metadata?: { sources?: QuerySource[]; confidence?: string }
          createdAt: string
        }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          type: "text" as const,
          content: m.content,
          time: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sources: m.metadata?.sources,
          confidence: m.metadata?.confidence as ChatMessage["confidence"],
        })
      )

      setMessagesByDoc((prev) => ({ ...prev, [docId]: loaded }))
    } catch {
      setMessagesByDoc((prev) => ({
        ...prev,
        [docId]: [WELCOME_MESSAGE(title)],
      }))
    }
  }, [])

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId]
  )

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!selectedId) return
      queryClient.setQueryData<ChatDocument[]>(
        queryKeys.documents.chat(),
        (prev) =>
          (prev ?? []).map((d) =>
            d.id === selectedId ? { ...d, status } : d
          )
      )
    },
    [selectedId, queryClient]
  )

  useSingleDocumentPolling(
    hasProcessing ? null : selectedId,
    selectedDoc?.status,
    handleStatusChange
  )

  useEffect(() => {
    if (selectedId && selectedDoc && !messagesByDoc[selectedId]) {
      loadConversation(selectedId, selectedDoc.title)
    }
  }, [selectedId, selectedDoc, messagesByDoc, loadConversation])

  const messages = useMemo(() => {
    if (!selectedId) return []
    if (messagesByDoc[selectedId]) return messagesByDoc[selectedId]
    if (selectedDoc) return [WELCOME_MESSAGE(selectedDoc.title)]
    return []
  }, [selectedId, messagesByDoc, selectedDoc])

  const lastPreview = useMemo(() => {
    const previews: Record<string, string> = {}
    for (const [docId, msgs] of Object.entries(messagesByDoc)) {
      const last = msgs[msgs.length - 1]
      if (last) {
        previews[docId] =
          last.type === "image"
            ? "📷 Image"
            : last.type === "voice"
              ? "🎤 Voice message"
              : last.content.slice(0, 60)
      }
    }
    return previews
  }, [messagesByDoc])

  function selectDocument(id: string) {
    const doc = documents.find((d) => d.id === id)
    if (!doc || doc.status !== "ready") return
    setSelectedId(id)
    router.push(`/chat/${id}`, { scroll: false })
  }

  function appendMessage(docId: string, message: ChatMessage) {
    setMessagesByDoc((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), message],
    }))
  }

  function updateMessage(
    docId: string,
    messageId: string,
    patch: Partial<ChatMessage>
  ) {
    setMessagesByDoc((prev) => ({
      ...prev,
      [docId]: (prev[docId] || []).map((m) =>
        m.id === messageId ? { ...m, ...patch } : m
      ),
    }))
  }

  async function sendText(question: string) {
    if (!selectedId || !selectedDoc) return

    appendMessage(selectedId, {
      id: uid(),
      role: "user",
      type: "text",
      content: question,
      time: now(),
    })
    setLoading(true)

    const assistantId = uid()
    appendMessage(selectedId, {
      id: assistantId,
      role: "assistant",
      type: "text",
      content: STREAM_STATUS.analyzing,
      streaming: true,
      time: now(),
    })

    try {
      let sources: QuerySource[] | undefined
      let confidence: QueryConfidence | undefined

      const reply = createStreamReplyHandlers({
        onUpdate: (content, streaming) => {
          updateMessage(selectedId, assistantId, { content, streaming })
        },
        onSources: (s) => {
          sources = s as QuerySource[]
          updateMessage(selectedId, assistantId, { sources })
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

      await streamDocumentQuery(
        selectedId,
        question,
        plainEnglish ? "plain_english" : "conversational",
        reply.handlers
      )

      const finalText = reply.finalize()
      updateMessage(selectedId, assistantId, {
        content: finalText || "No answer received.",
        sources,
        confidence,
        streaming: false,
      })
    } catch (err) {
      updateMessage(selectedId, assistantId, {
        content: err instanceof Error ? err.message : "Something went wrong",
        streaming: false,
      })
    } finally {
      setLoading(false)
    }
  }

  function sendImage(file: File, caption: string) {
    if (!selectedId) return
    const url = URL.createObjectURL(file)
    appendMessage(selectedId, {
      id: uid(),
      role: "user",
      type: "image",
      content: caption,
      attachmentUrl: url,
      time: now(),
    })
    appendMessage(selectedId, {
      id: uid(),
      role: "assistant",
      type: "text",
      content:
        "Image received. Image analysis will be available soon — for now, please describe what you'd like to know about this document in text.",
      time: now(),
    })
  }

  function sendVoice(duration: string) {
    if (!selectedId) return
    appendMessage(selectedId, {
      id: uid(),
      role: "user",
      type: "voice",
      content: "",
      voiceDuration: duration,
      time: now(),
    })
    appendMessage(selectedId, {
      id: uid(),
      role: "assistant",
      type: "text",
      content:
        "Voice message received. Voice transcription will be available soon — please type your question for now.",
      time: now(),
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "shrink-0 border-b border-border/60 px-4 py-4 md:px-6",
          isMobile && selectedDoc && "hidden md:block"
        )}
      >
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Chat
        </h1>
        <p className="mt-1 text-sm leading-normal text-muted-foreground">
          {PACTMIND_NAME} — {PACTMIND_TAGLINE}. Select a contract to start.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 md:px-6 md:pb-6">
        <div
          ref={splitRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/20 shadow-sm md:flex-row"
        >
          <div
            className={cn(
              "flex h-full min-h-0 w-full shrink-0 flex-col md:w-auto",
              isMobile && selectedId && "hidden md:flex"
            )}
          >
            <ChatInbox
              documents={documents}
              selectedId={selectedId}
              loading={loadingDocs}
              onSelect={selectDocument}
              onRefresh={() => void refetchDocuments()}
              lastPreview={lastPreview}
              width={inboxWidth}
              collapsed={isMobile ? false : inboxCollapsed}
              onToggleCollapse={isMobile ? undefined : toggleInbox}
            />
          </div>

          {!inboxCollapsed && (
            <button
              type="button"
              aria-label="Resize inbox"
              className="hidden w-1.5 shrink-0 cursor-col-resize border-0 bg-border/40 transition-colors hover:bg-primary/50 md:block"
              onMouseDown={() => {
                resizingInbox.current = true
                document.body.style.cursor = "col-resize"
                document.body.style.userSelect = "none"
              }}
            />
          )}

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background/50",
              isMobile && !selectedId && "hidden md:flex"
            )}
          >
            {!selectedDoc ? (
              <EmptyChatState />
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-primary-foreground md:rounded-none">
                  <div className="flex min-w-0 items-center gap-3">
                    {isMobile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-primary-foreground hover:bg-white/15"
                        onClick={() => {
                          setSelectedId(null)
                          router.push("/chat", { scroll: false })
                        }}
                        aria-label="Back to inbox"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                      {selectedDoc.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {selectedDoc.title}
                      </p>
                      <p className="text-[11px] leading-tight text-primary-foreground/75">
                        {selectedDoc.status === "ready"
                          ? `Ready · ${PACTMIND_NAME} active`
                          : selectedDoc.status === "processing"
                            ? "Processing document…"
                            : selectedDoc.status}
                      </p>
                    </div>
                  </div>
                  {!isMobile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-primary-foreground hover:bg-white/15"
                      onClick={() => {
                        setSelectedId(null)
                        router.push("/chat", { scroll: false })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20">
                  <div className="space-y-4 p-4">
                    {messages.map((msg) => (
                      <ChatMessageBubble key={msg.id} message={msg} />
                    ))}

                    {loading && !messages.some((m) => m.streaming) && (
                      <div className="flex gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                          AI
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {PACTMIND_NAME} is analyzing…
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/40 bg-card/30 px-4 pt-3">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setPlainEnglish((v) => !v)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                        plainEnglish
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      <Languages className="h-3 w-3" />
                      Plain English
                    </button>
                    {quickActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={action.label}
                          type="button"
                          disabled={loading}
                          onClick={() => sendText(action.label)}
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          <Icon className="h-3 w-3" />
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <ChatInput
                  disabled={selectedDoc.status !== "ready"}
                  loading={loading}
                  onSendText={sendText}
                  onSendImage={sendImage}
                  onSendVoice={sendVoice}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyChatState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold">Select a document</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Choose a contract from the inbox to start a conversation with{" "}
          {PACTMIND_NAME}
        </p>
      </div>
      <Link
        href="/dashboard/upload"
        className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
      >
        <FileText className="h-3.5 w-3.5" />
        Upload a new document
      </Link>
    </div>
  )
}
