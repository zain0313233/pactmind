import { NextResponse } from 'next/server'
import { platformSettingsRepository } from '@/repositories/platform-settings.repository'
import {
  APPEAL_SLA_TEXT,
  CHAT_LEGAL_DISCLAIMER,
  PACTMIND_USAGE_POLICY,
  STRIKE_POLICY_SUMMARY,
} from '@/lib/access-policy'
import { CACHE } from '@/lib/cache-headers'

export async function GET() {
  const settings = await platformSettingsRepository.get()
  return NextResponse.json(
    {
      policy: {
        usage: PACTMIND_USAGE_POLICY,
        strikes: STRIKE_POLICY_SUMMARY(settings.maxConsecutiveIrrelevant),
        appealSla: APPEAL_SLA_TEXT(settings.appealSlaBusinessDays),
        disclaimer: CHAT_LEGAL_DISCLAIMER,
        maxStrikes: settings.maxConsecutiveIrrelevant,
        appealSlaBusinessDays: settings.appealSlaBusinessDays,
      },
    },
    { status: 200, headers: CACHE.noStore }
  )
}
