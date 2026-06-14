import { NextRequest, NextResponse } from 'next/server'
import { requirePortalAccess } from '@/lib/auth-session'
import { documentRepository } from '@/repositories/document.repository'
import { hasPermission } from '@/lib/rbac'
import { assertValidQueryQuestion } from '@/lib/query-validation'
import { isDocumentQueryAllowed } from '@/lib/query-scope'
import { queryService } from '@/services/query.service'
import { checkAndIncrementUsage } from '@/lib/billing/checkUsage'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalAccess(req)
    const userId = user.id
    const ip = clientIp(req)
    if (!hasPermission(user.role, 'query:ask')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { allowed, reason } = await checkAndIncrementUsage(userId, 'chatMessages')
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 429 })
    }

    const body = await req.json()
    const { document_id, question, mode } = body

    if (!document_id) return NextResponse.json({ error: 'document_id is required' }, { status: 400 })
    let normalizedQuestion: string
    try {
      normalizedQuestion = assertValidQueryQuestion(question ?? '')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'question is required'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const document = await documentRepository.findById(document_id)
    if (!document || document.userId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const docGate = isDocumentQueryAllowed(document)
    if (!docGate.allowed) {
      return NextResponse.json(
        {
          answer: docGate.reason,
          sources: [],
          confidence: 'low',
        },
        { status: 200 }
      )
    }

    const queryMode =
      mode === 'plain_english'
        ? 'plain_english'
        : mode === 'default'
          ? 'default'
          : 'conversational'
    const result = await queryService.ask(
      userId,
      document_id,
      normalizedQuestion,
      queryMode,
      ip
    )

    return NextResponse.json(result, { status: 200 })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Query failed'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (message === 'Email not verified') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message === 'Access restricted') {
      return NextResponse.json({ error: message, code: 'ACCESS_RESTRICTED' }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
