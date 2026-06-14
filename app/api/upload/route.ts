import { NextRequest, NextResponse } from 'next/server'
import { requirePortalAccess } from '@/lib/auth-session'
import { validateUploadFile } from '@/lib/file-validation'
import { uploadService } from '@/services/upload.service'
import { userRepository } from '@/repositories/user.repository'
import { hasPermission } from '@/lib/rbac'
import { aiService } from '@/services/ai.service'
import { checkAndIncrementUsage } from '@/lib/billing/checkUsage'

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalAccess(req)
    const userId = user.id
    if (!hasPermission(user.role, 'document:upload')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { allowed, reason } = await checkAndIncrementUsage(userId, 'documentUploads')
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const { mime } = await validateUploadFile(file)

    const document = await uploadService.uploadFile(file, userId, title, mime)

    await aiService.processDocument({
      document_id: document.id,
      file_url: document.fileUrl,
      file_type: document.fileType,
      user_id: userId,
    })

    return NextResponse.json({ message: 'File uploaded and processing started', document }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (message === 'Email not verified') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
