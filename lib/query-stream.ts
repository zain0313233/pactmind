import type { QueryConfidence, QueryMode, QuerySource } from '@/lib/pactmind'
import { consumeSseStream } from '@/lib/sse-client'

export type StreamQueryHandlers = {
  onStatus?: (text: string) => void
  onToken: (text: string) => void
  onSources?: (sources: QuerySource[]) => void
  onDone?: (confidence: QueryConfidence) => void
  onWarning?: (text: string) => void
  onAccessRestricted?: () => void
}

export async function streamDocumentQuery(
  documentId: string,
  question: string,
  mode: QueryMode,
  handlers: StreamQueryHandlers
): Promise<void> {
  const res = await fetch('/api/query-stream', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      document_id: documentId,
      question,
      mode,
    }),
  })

  if (!res.ok) {
    let message = 'Query failed'
    try {
      const body = await res.json()
      message = body.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (!res.body) {
    throw new Error('No response stream')
  }

  await consumeSseStream(res.body, (_event, data) => {
    const payload = data as { type: string; [key: string]: unknown }

    if (payload.type === 'status' && typeof payload.text === 'string') {
      handlers.onStatus?.(payload.text)
      return
    }

    if (payload.type === 'token' && typeof payload.text === 'string') {
      handlers.onToken(payload.text)
      return
    }

    if (payload.type === 'sources' && Array.isArray(payload.sources)) {
      handlers.onSources?.(
        payload.sources.map((s: { content: string; chunk_index: number; score: number }) => ({
          content: s.content,
          chunkIndex: s.chunk_index,
          score: s.score,
        }))
      )
      return
    }

    if (payload.type === 'warning' && typeof payload.text === 'string') {
      handlers.onWarning?.(payload.text)
      return
    }

    if (payload.type === 'done' && typeof payload.confidence === 'string') {
      handlers.onDone?.(payload.confidence as QueryConfidence)
      if (payload.access_restricted === true) {
        handlers.onAccessRestricted?.()
      }
      return
    }

    if (payload.type === 'access_restricted') {
      handlers.onAccessRestricted?.()
    }
  })
}
