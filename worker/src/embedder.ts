/**
 * Embedding Worker
 *
 * Polls the memories table for rows with embedding_status = 'pending',
 * calls the configured embedding API, and updates the vector + status.
 *
 * Standardized on text-embedding-3-small (1536 dims) for v1.
 * Model name stored per-row for future migration flexibility.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Embedding provider: 'ollama' (local, free) or 'openai' (cloud, paid)
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER ?? 'ollama'
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434/v1'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3-embedding:4b'

const EMBEDDING_MODEL = EMBEDDING_PROVIDER === 'ollama'
  ? OLLAMA_MODEL
  : 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536
const BATCH_SIZE = 20
const POLL_INTERVAL_MS = 2_000

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = EMBEDDING_PROVIDER === 'ollama'
  ? new OpenAI({ apiKey: 'ollama', baseURL: OLLAMA_URL })
  : new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// ── Embed one batch ──────────────────────────────────────────────

async function embedBatch(): Promise<number> {
  // Fetch pending rows
  const { data: pending, error: fetchError } = await supabase
    .from('memories')
    .select('id, content')
    .eq('embedding_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    console.error('[embedder] fetch error:', fetchError.message)
    return 0
  }

  if (!pending || pending.length === 0) return 0

  console.log(`[embedder] processing ${pending.length} entries`)

  // Call embedding API (Ollama local or OpenAI cloud)
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: pending.map((row) => row.content),
      dimensions: EMBEDDING_DIMS,
    })

    // Update each row with its embedding
    for (let i = 0; i < pending.length; i++) {
      const row = pending[i]
      const vector = response.data[i].embedding

      const { error: updateError } = await supabase
        .from('memories')
        .update({
          embedding: vector,
          embedding_status: 'ready',
          embedding_model: EMBEDDING_MODEL,
        })
        .eq('id', row.id)

      if (updateError) {
        console.error(`[embedder] update error for ${row.id}:`, updateError.message)
        await supabase
          .from('memories')
          .update({ embedding_status: 'failed' })
          .eq('id', row.id)
      }
    }

    console.log(`[embedder] embedded ${pending.length} entries`)
    return pending.length
  } catch (err) {
    console.error('[embedder] API error:', err)

    // Mark all as failed so they don't block the queue
    for (const row of pending) {
      await supabase
        .from('memories')
        .update({ embedding_status: 'failed' })
        .eq('id', row.id)
    }

    return 0
  }
}

// ── Poll loop ────────────────────────────────────────────────────

export async function runEmbedderLoop(signal?: AbortSignal): Promise<void> {
  console.log(`[embedder] starting embedding worker loop (provider: ${EMBEDDING_PROVIDER}, model: ${EMBEDDING_MODEL})`)

  while (!signal?.aborted) {
    const processed = await embedBatch()

    // If we processed a full batch, immediately check for more
    if (processed >= BATCH_SIZE) continue

    // Otherwise wait before next poll
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    })
  }

  console.log('[embedder] loop stopped')
}
