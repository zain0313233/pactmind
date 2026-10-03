import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CACHE } from '@/lib/cache-headers'

export async function GET() {
  const checks: Record<string, string> = { api: 'ok' }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  const healthy = Object.values(checks).every((value) => value === 'ok')

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      service: 'pactmind-web',
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: CACHE.health,
    }
  )
}
