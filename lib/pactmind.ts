export const PACTMIND_NAME = "PactMind"
export const PACTMIND_TAGLINE = "Contract intelligence by PactMind"

export const PACTMIND_WELCOME = (documentTitle: string) =>
  `Hi! I'm ${PACTMIND_NAME}, your contract advisor for "${documentTitle}". Ask me anything — I'll walk through the document with you, remember our conversation, and cite the exact clauses. What would you like to understand first?`

export type QueryConfidence = "high" | "medium" | "low"

export type QuerySource = {
  content: string
  chunkIndex: number
  score: number
}

export type QueryMode = "default" | "plain_english" | "conversational"

export type PactMindQueryResponse = {
  answer: string
  sources: QuerySource[]
  confidence: QueryConfidence
  irrelevant?: boolean
  strike_warning?: string | null
  access_restricted?: boolean
}

export type PortfolioSource = {
  content: string
  chunkIndex: number
  documentId: string
  documentTitle: string
  score: number
}

export type PactMindPortfolioResponse = {
  answer: string
  sources: PortfolioSource[]
  confidence: QueryConfidence
  documentsSearched: number
}
