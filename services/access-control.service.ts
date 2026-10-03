import { prisma } from '@/lib/prisma'
import { ACCESS_RESTRICTED_MESSAGE } from '@/lib/access-control'
import { platformSettingsRepository } from '@/repositories/platform-settings.repository'
import { notificationRepository } from '@/repositories/notification.repository'
import { auditLogService } from '@/services/audit-log.service'
import {
  sendAccessRestrictedEmail,
  sendAccessRestoredEmail,
  sendAdminUnblockRequestEmail,
} from '@/lib/email'
import { strikeWarningMessage } from '@/lib/access-policy'

type QueryContext = {
  documentId?: string
  question?: string
  ipAddress?: string
}

export type QueryOutcome = {
  restricted: boolean
  count: number
  strikeWarning: string | null
}

export const accessControlService = {
  async recordIrrelevantQuery(
    userId: string,
    context?: QueryContext
  ): Promise<QueryOutcome> {
    const settings = await platformSettingsRepository.get()
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role === 'admin' || user.accessRestricted) {
      return {
        restricted: user?.accessRestricted ?? false,
        count: 0,
        strikeWarning: null,
      }
    }

    const nextCount = user.consecutiveIrrelevantCount + 1

    await auditLogService.record({
      action: 'irrelevant_query',
      targetUserId: userId,
      documentId: context?.documentId,
      question: context?.question,
      ipAddress: context?.ipAddress,
      metadata: { strikeCount: nextCount },
    })

    if (nextCount >= settings.maxConsecutiveIrrelevant) {
      await this.restrictUser(
        userId,
        `${settings.maxConsecutiveIrrelevant} consecutive irrelevant chat messages`,
        context
      )
      return { restricted: true, count: nextCount, strikeWarning: null }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { consecutiveIrrelevantCount: nextCount },
    })

    const strikeWarning =
      nextCount >= settings.strikeWarningAt
        ? strikeWarningMessage(nextCount, settings.maxConsecutiveIrrelevant)
        : null

    return { restricted: false, count: nextCount, strikeWarning }
  },

  async recordRelevantQuery(userId: string, context?: QueryContext) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.consecutiveIrrelevantCount === 0) return

    await prisma.user.update({
      where: { id: userId },
      data: { consecutiveIrrelevantCount: 0 },
    })

    await auditLogService.record({
      action: 'relevant_query_reset',
      targetUserId: userId,
      documentId: context?.documentId,
      ipAddress: context?.ipAddress,
    })
  },

  async restrictUser(
    userId: string,
    reason: string,
    context?: QueryContext
  ) {
    const settings = await platformSettingsRepository.get()
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role === 'admin') return

    await prisma.user.update({
      where: { id: userId },
      data: {
        accessRestricted: true,
        accessRestrictedAt: new Date(),
        accessRestrictedReason: reason,
        consecutiveIrrelevantCount: settings.maxConsecutiveIrrelevant,
      },
    })

    await auditLogService.record({
      action: 'access_restricted',
      targetUserId: userId,
      reason,
      documentId: context?.documentId,
      question: context?.question,
      ipAddress: context?.ipAddress,
    })

    await notificationRepository.notifyAdmins({
      type: 'user_access_restricted',
      title: 'User access restricted',
      body: `${user.email} was restricted after irrelevant chat usage.`,
      referenceKey: `user_access_restricted:${userId}`,
      metadata: { userId, email: user.email, reason },
    })

    void sendAccessRestrictedEmail(user.email, settings.maxConsecutiveIrrelevant).catch(
      () => undefined
    )
  },

  async requestUnblock(userId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')
    if (!user.accessRestricted) throw new Error('Account is not restricted')

    const now = new Date()

    await prisma.user.update({
      where: { id: userId },
      data: {
        unblockRequestPending: true,
        unblockRequestedAt: now,
      },
    })

    await auditLogService.record({
      action: 'unblock_requested',
      targetUserId: userId,
      ipAddress,
    })

    await notificationRepository.notifyAdmins({
      type: 'unblock_request',
      title: 'Unblock request',
      body: `${user.email} requested admin review to restore portal access.`,
      referenceKey: `unblock_request:${userId}:${now.getTime()}`,
      metadata: { userId, email: user.email, name: user.name },
    })

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true },
    })

    await Promise.all(
      admins.map((admin) =>
        sendAdminUnblockRequestEmail({
          adminEmail: admin.email,
          userEmail: user.email,
          userName: user.name,
          requestedAt: now.toISOString(),
        }).catch(() => undefined)
      )
    )
  },

  async adminUnblock(actorUserId: string, userId: string, note: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    await prisma.user.update({
      where: { id: userId },
      data: {
        accessRestricted: false,
        accessRestrictedAt: null,
        accessRestrictedReason: null,
        consecutiveIrrelevantCount: 0,
        unblockRequestPending: false,
        unblockRequestedAt: null,
      },
    })

    await auditLogService.record({
      action: 'access_restored',
      targetUserId: userId,
      actorUserId,
      reason: note,
    })

    await notificationRepository.createForUser({
      userId,
      type: 'access_restored',
      title: 'Access restored',
      body: 'Your portal access has been restored by an admin. Please use PactMind for contract-related questions only.',
      referenceKey: `access_restored:${userId}:${Date.now()}`,
    })

    void sendAccessRestoredEmail(user.email).catch(() => undefined)
  },

  async trackQueryOutcome(
    userId: string,
    irrelevant: boolean,
    context?: QueryContext
  ): Promise<QueryOutcome> {
    if (irrelevant) {
      return this.recordIrrelevantQuery(userId, context)
    }
    await this.recordRelevantQuery(userId, context)
    return { restricted: false, count: 0, strikeWarning: null }
  },

  restrictedMessage: ACCESS_RESTRICTED_MESSAGE,
}
