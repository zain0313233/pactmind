"use client"

import { useState } from "react"
import Image from "next/image"
import { Mic, Play, ChevronDown, ChevronUp, BookOpen } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PACTMIND_NAME } from "@/lib/pactmind"
import { isStreamStatusText } from "@/lib/streaming-chat-reply"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "./types"

const confidenceStyles = {
  high: "border-emerald-500/30 text-emerald-400",
  medium: "border-amber-500/30 text-amber-400",
  low: "border-red-500/30 text-red-400",
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  const [showSources, setShowSources] = useState(false)
  const hasSources = !isUser && message.sources && message.sources.length > 0
  const isStatusLine = !isUser && message.streaming && isStreamStatusText(message.content)

  return (
    <div
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[11px] font-semibold",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-primary/20 text-primary"
          )}
        >
          {isUser ? "U" : "CM"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[78%] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 px-0.5">
            <span className="text-[10px] font-medium text-primary">
              {PACTMIND_NAME}
            </span>
            {message.confidence && (
              <Badge
                variant="outline"
                className={cn(
                  "px-1.5 py-0 text-[9px] font-normal capitalize",
                  confidenceStyles[message.confidence]
                )}
              >
                {message.confidence} confidence
              </Badge>
            )}
          </div>
        )}

        {message.type === "text" && (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm leading-normal whitespace-pre-wrap",
              isUser
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-card text-foreground",
              isStatusLine && "text-muted-foreground italic"
            )}
          >
            {message.content}
            {message.streaming && !isStatusLine && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
            )}
            {isStatusLine && (
              <span className="ml-1 inline-block animate-pulse">|</span>
            )}
          </div>
        )}

        {message.type === "image" && message.attachmentUrl && (
          <div
            className={cn(
              "overflow-hidden rounded-2xl",
              isUser ? "bg-primary/20" : "border border-border/60 bg-card"
            )}
          >
            <div className="relative aspect-video w-56 max-w-full">
              <Image
                src={message.attachmentUrl}
                alt={message.content || "Shared image"}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            {message.content && (
              <p className="px-3.5 py-2 text-sm">{message.content}</p>
            )}
          </div>
        )}

        {message.type === "voice" && (
          <div
            className={cn(
              "flex min-w-[180px] items-center gap-3 rounded-2xl px-3.5 py-2.5",
              isUser
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-card text-foreground"
            )}
          >
            <button
              type="button"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                isUser ? "bg-white/20" : "bg-primary/15 text-primary"
              )}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
            <div className="flex-1 space-y-1">
              <div className="flex h-4 items-end gap-0.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-0.5 rounded-full",
                      isUser ? "bg-white/70" : "bg-primary/50"
                    )}
                    style={{ height: `${8 + (i % 4) * 4}px` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 text-[11px] opacity-80">
                <Mic className="h-3 w-3" />
                <span>{message.voiceDuration || "0:00"}</span>
              </div>
            </div>
          </div>
        )}

        {hasSources && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              <BookOpen className="h-3 w-3" />
              {message.sources!.length} source
              {message.sources!.length !== 1 ? "s" : ""}
              {showSources ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showSources && (
              <div className="mt-1.5 space-y-1.5">
                {message.sources!.map((src, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      [{i + 1}] Chunk {src.chunkIndex}
                    </span>
                    <p className="mt-0.5 line-clamp-3">{src.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p
          className={cn(
            "text-[10px] text-muted-foreground",
            isUser ? "text-right" : "text-left"
          )}
        >
          {message.time}
        </p>
      </div>
    </div>
  )
}
