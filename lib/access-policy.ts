/** User-facing policy copy for access control and PactMind usage. */

export const PACTMIND_USAGE_POLICY = `PactMind is for questions about your uploaded contract only — clauses, parties, payment terms, liability, termination, and risks in the document. General knowledge, news, coding, and off-topic chat are not supported.`

export const STRIKE_POLICY_SUMMARY = (maxStrikes: number) =>
  `${maxStrikes} consecutive off-topic messages will temporarily restrict portal access.`

export const APPEAL_SLA_TEXT = (businessDays: number) =>
  `Appeals are typically reviewed within ${businessDays} business day${businessDays === 1 ? '' : 's'}.`

export const CHAT_LEGAL_DISCLAIMER =
  'PactMind provides AI-assisted contract analysis — not legal advice. Review important decisions with qualified counsel.'

export const ACCEPTABLE_USE_LABEL =
  'I agree to use PactMind for contract analysis only and understand that misuse may restrict my access.'

export function strikeWarningMessage(
  currentCount: number,
  maxStrikes: number
): string | null {
  const remaining = maxStrikes - currentCount
  if (remaining <= 0 || remaining > 2) return null
  if (remaining === 1) {
    return 'Warning: one more off-topic message will temporarily restrict your portal access.'
  }
  return `Warning: ${remaining} more off-topic messages will temporarily restrict your portal access.`
}
