/**
 * Memory Operations Tool
 *
 * Store and search memories for agents. Inserts with embedding_status='pending'
 * so the embedder worker fills the vector asynchronously.
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface MemoryStoreResult {
  id: string
}

export async function memoryStore(
  userId: string,
  content: string,
  namespace: string,
): Promise<MemoryStoreResult> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      content,
      namespace,
      embedding_status: 'pending',
      origin: 'agent',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Memory store failed: ${error?.message ?? 'no data returned'}`)
  }

  return { id: data.id as string }
}

export interface MemorySearchResult {
  id: string
  content: string
  similarity: number
}

export async function memorySearch(
  userId: string,
  query: string,
  limit: number = 10,
): Promise<MemorySearchResult[]> {
  const supabase = getSupabase()

  // Use the match_memories RPC if available, otherwise fall back to text search
  const { data, error } = await supabase
    .from('memories')
    .select('id, content')
    .eq('user_id', userId)
    .ilike('content', `%${query}%`)
    .limit(limit)

  if (error) {
    throw new Error(`Memory search failed: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    content: row.content as string,
    similarity: 1.0, // text match — no cosine score without embedding
  }))
}
