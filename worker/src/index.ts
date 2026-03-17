/**
 * AgentForge Worker — Main Entry Point
 *
 * Runs background jobs:
 *   1. Embedding worker: fills pending memory vectors
 *   2. Task executor: runs agent tasks
 *
 * Designed for Railway deployment (long-running process).
 */

import 'dotenv/config'
import { runEmbedderLoop } from './embedder.js'
import { runExecutorLoop } from './executor.js'
import { runCleanupLoop } from './cleanup.js'

const controller = new AbortController()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received, shutting down...')
  controller.abort()
})
process.on('SIGINT', () => {
  console.log('[worker] SIGINT received, shutting down...')
  controller.abort()
})

async function main() {
  console.log('[worker] AgentForge worker starting...')
  console.log(`[worker] SUPABASE_URL: ${process.env.SUPABASE_URL ? 'configured' : 'MISSING'}`)
  console.log(`[worker] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'configured' : 'MISSING'}`)
  console.log(`[worker] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'MISSING'}`)
  console.log(`[worker] BRAVE_SEARCH_API_KEY: ${process.env.BRAVE_SEARCH_API_KEY ? 'configured' : 'MISSING'}`)
  console.log(`[worker] OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'configured' : 'MISSING'}`)
  console.log(`[worker] GOOGLE_GEMINI_API_KEY: ${process.env.GOOGLE_GEMINI_API_KEY ? 'configured' : 'MISSING'}`)
  console.log(`[worker] AGENTICA_ROUTING: ${process.env.OPENROUTER_API_KEY || process.env.GOOGLE_GEMINI_API_KEY ? 'enabled' : 'fallback'}`)

  // Run embedder, executor, and cleanup loops concurrently
  await Promise.all([
    runEmbedderLoop(controller.signal),
    runExecutorLoop(controller.signal),
    runCleanupLoop(controller.signal),
  ])

  console.log('[worker] worker stopped')
}

main().catch((err) => {
  console.error('[worker] fatal error:', err)
  process.exit(1)
})
