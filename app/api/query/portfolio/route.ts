import { NextRequest, NextResponse } from 'next/server'
import { requirePortalAccess } from '@/lib/auth-session'
import { userRepository } from '@/repositories/user.repository'
import { documentRepository } from '@/repositories/document.repository'
import { hasPermission } from '@/lib/rbac'
import { assertValidQueryQuestion } from '@/lib/query-validation'
import { aiService } from '@/services/ai.service'
import { checkAndIncrementUsage } from '@/lib/billing/checkUsage'

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalAccess(req)
    const userId = user.id
    if (!hasPermission(user.role, 'query:ask')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { allowed, reason } = await checkAndIncrementUsage(userId, 'portfolioSearches')
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 429 })
    }

    const body = await req.json()
    const { question } = body

    let normalizedQuestion: string
    try {
      normalizedQuestion = assertValidQueryQuestion(question ?? '')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'question is required'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const documents = await documentRepository.findReadyByUserId(userId)
    const documentIds = documents.map((d) => d.id)
    const documentTitles = Object.fromEntries(
      documents.map((d) => [d.id, d.title])
    )

    const result = await aiService.queryPortfolio({
      question: normalizedQuestion,
      user_id: userId,
      document_ids: documentIds,
      document_titles: documentTitles,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Portfolio query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
