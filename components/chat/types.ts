import type { QueryConfidence, QuerySource } from "@/lib/pactmind"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  type: "text" | "image" | "voice"
  content: string
  attachmentUrl?: string
  voiceDuration?: string
  time: string
  sources?: QuerySource[]
  confidence?: QueryConfidence
  streaming?: boolean
}

export type ChatDocument = {
  id: string
  title: string
  fileName: string
  fileType: string
  status: string
  createdAt: string
}
