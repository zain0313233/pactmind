import type { QuerySource } from '@/lib/pactmind'

type StoredSource = {
  chunkIndex: number
  score: number
}

export function sanitizeSourcesForStorage(
  sources: Array<{
    content?: string
    chunkIndex?: number
    chunk_index?: number
    score: number
  }>
): StoredSource[] {
  return sources.map((source) => ({
    chunkIndex: source.chunkIndex ?? source.chunk_index ?? 0,
    score: source.score,
  }))
}

export function normalizeStoredSources(
  sources: unknown
): QuerySource[] | undefined {
  if (!Array.isArray(sources)) return undefined

  return sources.map((source, index) => {
    const row = source as {
      content?: string
      chunkIndex?: number
      chunk_index?: number
      score?: number
    }

    const chunkIndex = row.chunkIndex ?? row.chunk_index ?? index

    return {
      chunkIndex,
      score: row.score ?? 0,
      content: row.content ?? `Excerpt [${chunkIndex + 1}] (not stored in history)`,
    }
  })
}
