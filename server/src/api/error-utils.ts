export interface ApiErrorResponseShape {
  status: number
  code: string
  message: string
  retryAt?: string
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const asRecord = error as Record<string, unknown>
    if (typeof asRecord.message === 'string') return asRecord.message
  }
  return 'Internal server error'
}

function getNumericStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const asRecord = error as Record<string, unknown>
  const status = asRecord.status
  if (typeof status === 'number') return status
  return null
}

function parseRetryAt(message: string): string | undefined {
  const match = message.match(
    /regain access on\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2})\s+UTC/i,
  )
  if (!match) return undefined
  return `${match[1]}T${match[2]}:00Z`
}

export function mapApiError(error: unknown): ApiErrorResponseShape {
  const message = extractMessage(error)
  const lower = message.toLowerCase()
  const statusFromError = getNumericStatus(error)

  const quotaLike =
    /you have reached your specified api usage limits/.test(lower) ||
    /insufficient_quota/.test(lower) ||
    /credit balance/.test(lower) ||
    /billing/.test(lower)

  if (quotaLike || statusFromError === 429) {
    const retryAt = parseRetryAt(message)
    return {
      status: 429,
      code: 'UPSTREAM_QUOTA_EXCEEDED',
      message: retryAt
        ? `Upstream provider quota reached. Retry after ${retryAt}.`
        : 'Upstream provider quota reached. Retry later or update billing limits.',
      retryAt,
    }
  }

  const authLike =
    /invalid api key/.test(lower) ||
    /authentication/.test(lower) ||
    /unauthorized/.test(lower) ||
    /forbidden/.test(lower)

  if (authLike || statusFromError === 401 || statusFromError === 403) {
    return {
      status: 401,
      code: 'UPSTREAM_AUTH_ERROR',
      message: 'Upstream provider authentication failed. Verify API credentials.',
    }
  }

  return {
    status: statusFromError && statusFromError >= 400 && statusFromError < 600
      ? statusFromError
      : 500,
    code: 'INTERNAL_ERROR',
    message,
  }
}
