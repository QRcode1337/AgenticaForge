/**
 * Memory Edge Functions
 *
 * Store, search, delete, update memories via Supabase.
 * Embeddings are NOT generated here — rows are inserted with
 * embedding_status = 'pending', and the worker fills them async.
 *
 * SECURITY: user_id must be derived from session JWT, never from payload.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── Types ────────────────────────────────────────────────────────

interface StoreParams {
  userId: string
  content: string
  namespace: string
  type?: 'fact' | 'decision' | 'run_summary' | 'artifact' | 'pattern' | 'tool_trace'
  origin?: 'human' | 'agent' | 'sim'
  visibility?: 'private' | 'shared'
  metadata?: Record<string, string>
  ttlSeconds?: number
}

interface SearchParams {
  userId: string
  query: string
  namespace?: string
  tier?: 'hot' | 'warm' | 'cold'
  limit?: number
  minScore?: number
}

interface SearchResult {
  id: string
  content: string
  namespace: string
  tier: string
  score: number
  similarity: number
  type: string
  origin: string
  createdAt: string
}

// ── Store memory ────────────────────────────────────────────────
// Inserts immediately with embedding_status = 'pending'.
// Worker will async-fill the embedding vector.

export async function storeMemory(params: StoreParams) {
  const contentHash = await hashContent(params.content)

  // Dedupe check
  const { data: existing } = await supabase
    .from('memories')
    .select('id')
    .eq('user_id', params.userId)
    .eq('content_hash', contentHash)
    .single()

  if (existing) {
    // Bump last accessed time (access_count can be incremented via RPC if available)
    await supabase
      .from('memories')
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    return { id: existing.id, deduplicated: true }
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: params.userId,
      content: params.content,
      namespace: params.namespace,
      type: params.type ?? 'fact',
      origin: params.origin ?? 'human',
      visibility: params.visibility ?? 'private',
      metadata: params.metadata ?? {},
      content_hash: contentHash,
      ttl_seconds: params.ttlSeconds,
      embedding_status: 'pending',
      tier: 'hot',
      score: 1.0,
    })
    .select('id, content, namespace, tier, score, type, origin, created_at')
    .single()

  if (error) throw error
  return { ...data, deduplicated: false }
}

// ── Search memories ─────────────────────────────────────────────
// Two-path search:
//   1. If query has an embedding (pre-computed by caller or worker),
//      use pgvector cosine similarity (fast, index-accelerated).
//   2. Fallback: text ILIKE search for entries without embeddings.
//
// Scoring (temporal decay, tier boosts) applied in application layer.

export async function searchMemories(
  params: SearchParams,
  queryEmbedding?: number[],
): Promise<SearchResult[]> {
  const limit = params.limit ?? 20

  if (queryEmbedding && queryEmbedding.length > 0) {
    // Vector similarity search — only against rows with ready embeddings
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: queryEmbedding,
      match_user_id: params.userId,
      match_namespace: params.namespace ?? null,
      match_tier: params.tier ?? null,
      match_limit: limit,
    })

    if (error) throw error
    return (data ?? []) as SearchResult[]
  }

  // Fallback: text search
  let query = supabase
    .from('memories')
    .select('id, content, namespace, tier, score, type, origin, created_at')
    .eq('user_id', params.userId)
    .ilike('content', `%${params.query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params.namespace) query = query.eq('namespace', params.namespace)
  if (params.tier) query = query.eq('tier', params.tier)

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id as string,
    content: row.content as string,
    namespace: row.namespace as string,
    tier: row.tier as string,
    score: row.score as number,
    similarity: 0, // no vector similarity for text fallback
    type: row.type as string,
    origin: row.origin as string,
    createdAt: row.created_at as string,
  }))
}

// ── Get tier breakdown ──────────────────────────────────────────

export async function getTierBreakdown(userId: string) {
  const { data, error } = await supabase
    .from('memories')
    .select('id, content, namespace, tier, score, type, origin, access_count, created_at, last_accessed_at')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false })

  if (error) throw error

  const entries = data ?? []
  const hot = entries.filter((e) => e.tier === 'hot')
  const warm = entries.filter((e) => e.tier === 'warm')
  const cold = entries.filter((e) => e.tier === 'cold')

  return { hot, warm, cold, total: entries.length }
}

// ── Get stats ───────────────────────────────────────────────────

export async function getStats(userId: string) {
  const { count: entryCount, error: countError } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) throw countError

  const { count: embeddedCount } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('embedding_status', 'ready')

  const { count: pendingCount } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('embedding_status', 'pending')

  return {
    entryCount: entryCount ?? 0,
    embeddedCount: embeddedCount ?? 0,
    pendingEmbeddings: pendingCount ?? 0,
  }
}

// ── Delete memory ───────────────────────────────────────────────

export async function deleteMemory(userId: string, memoryId: string) {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId)

  if (error) throw error
  return { deleted: true }
}

// ── Update memory ───────────────────────────────────────────────

export async function updateMemory(
  userId: string,
  memoryId: string,
  content: string,
) {
  const contentHash = await hashContent(content)

  const { data, error } = await supabase
    .from('memories')
    .update({
      content,
      content_hash: contentHash,
      embedding_status: 'pending', // re-embed after content change
      embedding: null,
    })
    .eq('id', memoryId)
    .eq('user_id', userId)
    .select('id, content, namespace, tier, score, type, origin, created_at')
    .single()

  if (error) throw error
  return data
}

// ── Hash helper ─────────────────────────────────────────────────

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
