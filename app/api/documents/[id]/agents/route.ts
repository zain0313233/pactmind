import { NextRequest, NextResponse } from 'next/server'
import { requirePortalAccess } from '@/lib/auth-session'
import { documentRepository } from '@/repositories/document.repository'
import { agentRepository } from '@/repositories/agent.repository'
import { userRepository } from '@/repositories/user.repository'
import { hasPermission } from '@/lib/rbac'
import { aiService } from '@/services/ai.service'
import { checkAndIncrementUsage } from '@/lib/billing/checkUsage'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePortalAccess(req)
    const userId = user.id
    if (!hasPermission(user.role, 'document:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const document = await documentRepository.findById(id)
    if (!document || document.userId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const report = document.agentReport ?? await agentRepository.findByDocumentId(id)

    return NextResponse.json({ report }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePortalAccess(req)
    const userId = user.id
    if (!hasPermission(user.role, 'document:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const document = await documentRepository.findById(id)
    if (!document || document.userId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (document.status !== 'ready') {
      return NextResponse.json({ error: 'Document must be ready' }, { status: 400 })
    }

    const { allowed, reason } = await checkAndIncrementUsage(userId, 'agentRuns')
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 429 })
    }

    await aiService.triggerAgents({
      document_id: id,
      file_url: document.fileUrl,
      file_type: document.fileType,
      user_id: userId,
    })

    return NextResponse.json({ message: 'Agent team started' }, { status: 202 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
