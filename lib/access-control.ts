import { platformSettingsRepository } from '@/repositories/platform-settings.repository'
import {
  APPEAL_SLA_TEXT,
  PACTMIND_USAGE_POLICY,
  STRIKE_POLICY_SUMMARY,
  strikeWarningMessage,
} from '@/lib/access-policy'

export const ACCESS_RESTRICTED_CODE = 'ACCESS_RESTRICTED'

export const ACCESS_RESTRICTED_MESSAGE =
  'Your access has been temporarily restricted because PactMind detected repeated off-topic use. Request an admin review from the dialog below to restore access.'

export function buildRestrictedOverlayMessage(
  maxStrikes: number,
  appealSlaDays: number
): string {
  return [
    ACCESS_RESTRICTED_MESSAGE,
    PACTMIND_USAGE_POLICY,
    STRIKE_POLICY_SUMMARY(maxStrikes),
    APPEAL_SLA_TEXT(appealSlaDays),
  ].join(' ')
}

export function isAccessRestricted(user: {
  accessRestricted?: boolean | null
  role?: string | null
}): boolean {
  if (user.role === 'admin') return false
  return user.accessRestricted === true
}

export async function getAccessControlConfig() {
  const settings = await platformSettingsRepository.get()
  return {
    maxConsecutiveIrrelevant: settings.maxConsecutiveIrrelevant,
    strikeWarningAt: settings.strikeWarningAt,
    appealSlaBusinessDays: settings.appealSlaBusinessDays,
  }
}

export async function getStrikeWarning(
  currentCount: number
): Promise<string | null> {
  const { maxConsecutiveIrrelevant, strikeWarningAt } =
    await platformSettingsRepository.get()
  if (currentCount < strikeWarningAt) return null
  return strikeWarningMessage(currentCount, maxConsecutiveIrrelevant)
}

/** @deprecated use getAccessControlConfig().maxConsecutiveIrrelevant */
export const MAX_CONSECUTIVE_IRRELEVANT = 5
