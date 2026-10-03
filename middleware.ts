import { NextRequest, NextResponse } from 'next/server'
import {
  rateLimiter,
  authRateLimiter,
  queryRateLimiter,
  uploadRateLimiter,
  aiProcessingRateLimiter,
} from '@/lib/rate-limit'
import { getCorsHeaders } from '@/lib/cors'
import { applySecurityHeaders } from '@/lib/security-headers'
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/request-id'
import { getRateLimitKeys } from '@/lib/rate-limit-key'
import { logger } from '@/lib/logger'
import type { Ratelimit } from '@upstash/ratelimit'

function shouldSkipRateLimit(): boolean {
  if (process.env.NODE_ENV === 'test') return true
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.PLAYWRIGHT_TEST === '1'
  ) {
    return true
  }
  return false
}

/**
 * Load-testing bypass — disabled unless LOAD_TEST_BYPASS_SECRET is explicitly set
 * (never set this in real production). Requires the caller to send a matching
 * `x-load-test-key` header, so it fails closed by default in every environment.
 *
 * Only bypasses the Upstash rate limiter — per-plan usage limits, upload security
 * scanning, and off-topic abuse detection are untouched. Pair with a dedicated
 * Pro Plus test account for realistic capacity testing. See /load-tests/README.md.
 */
function loadTestBypass(req: NextRequest): boolean {
  const secret = process.env.LOAD_TEST_BYPASS_SECRET
  if (!secret) return false
  return req.headers.get('x-load-test-key') === secret
}

function isAiProcessingRoute(pathname: string, method: string): boolean {
  if (method !== 'POST') return false
  if (pathname === '/api/upload') return true
  return /^\/api\/documents\/[^/]+\/(analysis|agents|compare)$/.test(pathname)
}

async function limitIpAndUser(
  ip: string,
  userKey: string | null,
  limiter: Ratelimit
): Promise<boolean> {
  const ipResult = await limiter.limit(ip)
  if (!ipResult.success) return false

  if (userKey) {
    const userResult = await limiter.limit(userKey)
    if (!userResult.success) return false
  }

  return true
}

function withCommonHeaders(response: NextResponse, requestId: string): NextResponse {
  applySecurityHeaders(response.headers)
  response.headers.set(REQUEST_ID_HEADER, requestId)

  try {
    const corsHeaders = getCorsHeaders()
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (response.headers.get(key) == null) {
        response.headers.set(key, value)
      }
    })
  } catch (error) {
    logger.error('cors.config_error', {
      message: error instanceof Error ? error.message : 'Invalid CORS config',
    })
  }

  return response
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const requestId = getOrCreateRequestId(req.headers.get(REQUEST_ID_HEADER))
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const skipRateLimit = shouldSkipRateLimit() || loadTestBypass(req)
  const { user: userRateKey } = getRateLimitKeys(req, ip)

  let corsHeaders: Record<string, string>
  try {
    corsHeaders = getCorsHeaders()
  } catch (error) {
    logger.error('cors.config_error', {
      message: error instanceof Error ? error.message : 'Invalid CORS config',
    })
    return withCommonHeaders(
      NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }),
      requestId
    )
  }

  if (req.method === 'OPTIONS') {
    return withCommonHeaders(NextResponse.json({}, { headers: corsHeaders }), requestId)
  }

  if (pathname === '/api/health' || pathname === '/api/stripe/webhook') {
    return withCommonHeaders(NextResponse.next(), requestId)
  }

  if (
    !skipRateLimit &&
    (pathname === '/api/login' ||
      pathname === '/api/signup' ||
      pathname.startsWith('/api/auth/'))
  ) {
    const allowed = await limitIpAndUser(ip, userRateKey, authRateLimiter)
    if (!allowed) {
      return withCommonHeaders(
        NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: corsHeaders }
        ),
        requestId
      )
    }
  }

  if (
    !skipRateLimit &&
    (pathname === '/api/query' ||
      pathname === '/api/query-stream' ||
      pathname === '/api/query/portfolio')
  ) {
    const allowed = await limitIpAndUser(ip, userRateKey, queryRateLimiter)
    if (!allowed) {
      return withCommonHeaders(
        NextResponse.json(
          { error: 'Query rate limit exceeded. Please try again later.' },
          { status: 429, headers: corsHeaders }
        ),
        requestId
      )
    }
  }

  if (!skipRateLimit && pathname === '/api/upload') {
    const allowed = await limitIpAndUser(ip, userRateKey, uploadRateLimiter)
    if (!allowed) {
      return withCommonHeaders(
        NextResponse.json(
          { error: 'Upload rate limit exceeded. Please try again later.' },
          { status: 429, headers: corsHeaders }
        ),
        requestId
      )
    }
  }

  if (!skipRateLimit && isAiProcessingRoute(pathname, req.method)) {
    const allowed = await limitIpAndUser(ip, userRateKey, aiProcessingRateLimiter)
    if (!allowed) {
      return withCommonHeaders(
        NextResponse.json(
          { error: 'Processing rate limit exceeded. Please try again later.' },
          { status: 429, headers: corsHeaders }
        ),
        requestId
      )
    }
  }

  if (!skipRateLimit && pathname.startsWith('/api')) {
    const allowed = await limitIpAndUser(ip, userRateKey, rateLimiter)
    if (!allowed) {
      return withCommonHeaders(
        NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: corsHeaders }
        ),
        requestId
      )
    }
  }

  if (pathname.startsWith('/api') && process.env.NODE_ENV === 'production') {
    logger.info('api.request', {
      requestId,
      method: req.method,
      path: pathname,
    })
  }

  return withCommonHeaders(NextResponse.next(), requestId)
}

export const config = {
  matcher: '/api/:path*',
}
