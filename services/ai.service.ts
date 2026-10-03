import { randomUUID } from 'crypto'
import { createSignedFileUrl } from '@/lib/storage'
import { getEngineApiSecret } from '@/lib/engine-secret'
import { logger } from '@/lib/logger'
import type {
  PactMindPortfolioResponse,
  PactMindQueryResponse,
  QueryMode,
} from '@/lib/pactmind'
import type { ChatHistoryTurn } from '@/lib/conversation-history'

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000'

function engineHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getEngineApiSecret()}`,
    'x-request-id': randomUUID(),
  }
}

async function signedUrl(fileUrlOrPath: string): Promise<string> {
  return createSignedFileUrl(fileUrlOrPath)
}

async function assertEngineOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) return

  let detail: unknown
  try {
    const body = await response.json()
    detail = body?.detail ?? body?.error
  } catch {
    detail = undefined
  }

  logger.error('ai.engine.request_failed', {
    status: response.status,
    detail,
    engineSecretLength: getEngineApiSecret().length,
  })

  if (response.status === 401) {
    throw new Error(
      'AI engine authentication failed — ensure ENGINE_API_SECRET matches in pactmind/.env and pactmind-engine/.env, then restart both servers'
    )
  }

  throw new Error(fallbackMessage)
}

export const aiService = {
  processDocument: async (data: {
    document_id: string
    file_url: string
    file_type: string
    user_id: string
  }) => {
    const response = await fetch(`${AI_ENGINE_URL}/process/`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify({
        ...data,
        file_url: await signedUrl(data.file_url),
      }),
    })

    await assertEngineOk(response, 'Failed to process document')
    return response.json()
  },

  deleteDocumentVectors: async (data: {
    document_id: string
    user_id: string
  }) => {
    const response = await fetch(`${AI_ENGINE_URL}/process/delete-vectors`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify(data),
    })

    await assertEngineOk(response, 'Failed to delete document vectors')
    return response.json()
  },

  queryDocument: async (data: {
    document_id: string
    question: string
    user_id: string
    mode?: QueryMode
    history?: ChatHistoryTurn[]
  }): Promise<PactMindQueryResponse> => {
    const response = await fetch(`${AI_ENGINE_URL}/query/`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify({
        document_id: data.document_id,
        question: data.question,
        user_id: data.user_id,
        mode: data.mode ?? 'conversational',
        history: data.history ?? [],
      }),
    })

    await assertEngineOk(response, 'Query failed')
    const body = await response.json()
    return {
      answer: body.answer,
      sources: (body.sources || []).map(
        (s: { content: string; chunk_index: number; score: number }) => ({
          content: s.content,
          chunkIndex: s.chunk_index,
          score: s.score,
        })
      ),
      confidence: body.confidence,
      irrelevant: body.irrelevant === true,
    } as PactMindQueryResponse
  },

  queryPortfolio: async (data: {
    question: string
    user_id: string
    document_ids: string[]
    document_titles: Record<string, string>
  }): Promise<PactMindPortfolioResponse> => {
    const response = await fetch(`${AI_ENGINE_URL}/portfolio/`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify(data),
    })

    await assertEngineOk(response, 'Portfolio query failed')
    const body = await response.json()

    return {
      answer: body.answer,
      confidence: body.confidence,
      documentsSearched: body.documents_searched,
      sources: (body.sources || []).map(
        (s: {
          content: string
          chunk_index: number
          document_id: string
          document_title: string
          score: number
        }) => ({
          content: s.content,
          chunkIndex: s.chunk_index,
          documentId: s.document_id,
          documentTitle: s.document_title,
          score: s.score,
        })
      ),
    }
  },

  triggerComparison: async (data: {
    document_id: string
    template_id: string
    user_id: string
    document_file_url: string
    document_file_type: string
    template_file_url: string
    template_file_type: string
    template_name: string
  }) => {
    const response = await fetch(`${AI_ENGINE_URL}/compare/`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify({
        ...data,
        document_file_url: await signedUrl(data.document_file_url),
        template_file_url: await signedUrl(data.template_file_url),
      }),
    })

    await assertEngineOk(response, 'Failed to trigger comparison')
    return response.json()
  },

  triggerAgents: async (data: {
    document_id: string
    file_url: string
    file_type: string
    user_id: string
  }) => {
    const response = await fetch(`${AI_ENGINE_URL}/agents/`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify({
        document_id: data.document_id,
        file_url: await signedUrl(data.file_url),
        file_type: data.file_type,
        user_id: data.user_id,
      }),
    })

    await assertEngineOk(response, 'Failed to trigger agent team')
    return response.json()
  },

  triggerAnalysis: async (data: {
    document_id: string
    file_url: string
    file_type: string
    user_id: string
  }) => {
    const response = await fetch(`${AI_ENGINE_URL}/analyze/`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify({
        document_id: data.document_id,
        file_url: await signedUrl(data.file_url),
        file_type: data.file_type,
        user_id: data.user_id,
      }),
    })

    await assertEngineOk(response, 'Failed to trigger analysis')
    return response.json()
  },

  validateDocument: async (data: {
    document_id: string
    title?: string
    reviewed_by?: string | null
    persist?: boolean
  }) => {
    const response = await fetch(`${AI_ENGINE_URL}/validate/document`, {
      method: 'POST',
      headers: engineHeaders(),
      body: JSON.stringify({
        document_id: data.document_id,
        title: data.title ?? '',
        reviewed_by: data.reviewed_by ?? null,
        persist: data.persist ?? true,
      }),
    })

    await assertEngineOk(response, 'Document validation failed')
    return response.json()
  },
}
