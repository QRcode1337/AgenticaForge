/**
 * Embedding Worker - Background process for generating memory embeddings
 *
 * Polls the database for memories with embedding_status = 'pending',
 * generates 1536-dim vectors using OpenAI API, and updates the database.
 *
 * Run: npx tsx server/worker/src/embedding-worker.ts
 */

import 'dotenv/config'
import { db } from '../../db/index.js'
import { memories } from '../../db/schema.js'
import { eq, and } from 'drizzle-orm'
import OpenAI from 'openai'

// ── Configuration ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000 // Poll every 5 seconds
const BATCH_SIZE = 10 // Process up to 10 memories per batch
const MAX_RETRIES = 3 // Max retry attempts per memory
const EMBEDDING_MODEL = 'text-embedding-3-small' // OpenAI model (1536 dims)

// ── OpenAI Client ────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ── Types ─────────────────────────────────────────────────────────

interface PendingMemory {
  id: string
  content: string
  userId: string
  namespace: string
  attempts?: number
}

// ── Embedding Generation ─────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

// ── Batch Processing ──────────────────────────────────────────────

async function processBatch() {
  try {
    // Fetch pending memories
    const pending = await db
      .select({
        id: memories.id,
        content: memories.content,
        userId: memories.userId,
        namespace: memories.namespace,
      })
      .from(memories)
      .where(eq(memories.embeddingStatus, 'pending'))
      .limit(BATCH_SIZE)

    if (pending.length === 0) {
      return 0 // No work to do
    }

    console.log(`\n[${new Date().toISOString()}] Processing ${pending.length} pending memories...`)

    let successCount = 0
    let failureCount = 0

    // Process each memory
    for (const memory of pending) {
      try {
        // Generate embedding
        const embedding = await generateEmbedding(memory.content)

        // Update database
        await db
          .update(memories)
          .set({
            embedding: JSON.stringify(embedding), // Store as JSON array
            embeddingStatus: 'ready',
            embeddingModel: EMBEDDING_MODEL,
          })
          .where(eq(memories.id, memory.id))

        successCount++
        console.log(`  ✅ ${memory.id.slice(0, 8)}... [${memory.namespace}] - Embedded successfully`)
      } catch (error) {
        failureCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        console.error(`  ❌ ${memory.id.slice(0, 8)}... [${memory.namespace}] - Failed: ${errorMessage}`)

        // Mark as failed after max retries
        await db
          .update(memories)
          .set({
            embeddingStatus: 'failed',
          })
          .where(eq(memories.id, memory.id))
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`  Results: ${successCount} succeeded, ${failureCount} failed`)
    return pending.length
  } catch (error) {
    console.error('Batch processing error:', error)
    return 0
  }
}

// ── Main Worker Loop ──────────────────────────────────────────────

async function runWorker() {
  console.log('🚀 Embedding Worker Started')
  console.log(`   Model: ${EMBEDDING_MODEL}`)
  console.log(`   Batch Size: ${BATCH_SIZE}`)
  console.log(`   Poll Interval: ${POLL_INTERVAL_MS}ms`)
  console.log()

  // Verify OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment')
    process.exit(1)
  }

  // Main loop
  while (true) {
    try {
      const processed = await processBatch()

      if (processed === 0) {
        // No work - wait before next poll
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      } else {
        // Work was done - poll immediately for more
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('Worker loop error:', error)
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

// ── Health Check Endpoint (optional) ──────────────────────────────

async function getWorkerStatus() {
  try {
    const pending = await db
      .select({ count: memories.id })
      .from(memories)
      .where(eq(memories.embeddingStatus, 'pending'))

    const ready = await db
      .select({ count: memories.id })
      .from(memories)
      .where(eq(memories.embeddingStatus, 'ready'))

    const failed = await db
      .select({ count: memories.id })
      .from(memories)
      .where(eq(memories.embeddingStatus, 'failed'))

    return {
      pending: pending.length,
      ready: ready.length,
      failed: failed.length,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Status check error:', error)
    return null
  }
}

// ── Graceful Shutdown ─────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Shutting down gracefully...')
  process.exit(0)
})

// ── Start Worker ──────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { runWorker, processBatch, generateEmbedding, getWorkerStatus }
