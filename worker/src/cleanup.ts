/**
 * Events Cleanup Worker
 *
 * Periodically deletes expired events (past their expires_at).
 * Runs every hour — cheap query on the indexed expires_at column.
 * Complementary to the pg_cron schedule (runs even if pg_cron isn't enabled).
 */

import { createClient } from '@supabase/supabase-js'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function cleanupExpiredEvents(): Promise<number> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('cleanup_expired_events')

  if (error) {
    // RPC might not exist — fall back to direct delete
    const { count, error: deleteError } = await supabase
      .from('events')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date().toISOString())

    if (deleteError) {
      console.error('[cleanup] failed to delete expired events:', deleteError.message)
      return 0
    }

    return count ?? 0
  }

  return typeof data === 'number' ? data : 0
}

export async function runCleanupLoop(signal?: AbortSignal): Promise<void> {
  console.log('[cleanup] starting expired events cleanup loop (interval: 1h)')

  while (!signal?.aborted) {
    try {
      const deleted = await cleanupExpiredEvents()
      if (deleted > 0) {
        console.log(`[cleanup] deleted ${deleted} expired events`)
      }
    } catch (err) {
      console.error('[cleanup] error:', err)
    }

    // Wait before next cleanup
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, CLEANUP_INTERVAL_MS)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    })
  }

  console.log('[cleanup] loop stopped')
}
