/**
 * Worker Status Checker
 *
 * Check the status of pending/ready/failed embeddings.
 * Run: npx tsx server/worker-status.ts
 */

import 'dotenv/config'
import { db } from './db/index.js'
import { memories } from './db/schema.js'
import { eq, sql, and, desc } from 'drizzle-orm'

async function main() {
  console.log('\n=== Embedding Worker Status ===\n')

  // Count by status
  const stats = await db
    .select({
      status: memories.embeddingStatus,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(memories)
    .groupBy(memories.embeddingStatus)

  console.log('Status Breakdown:')
  for (const stat of stats) {
    const status = stat.status.padEnd(10)
    const count = stat.count.toString().padStart(5)
    const bar = '█'.repeat(Math.min(stat.count, 50))
    console.log(`  ${status} ${count}  ${bar}`)
  }

  // Recent pending memories
  const pending = await db
    .select({
      id: memories.id,
      namespace: memories.namespace,
      content: memories.content,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(eq(memories.embeddingStatus, 'pending'))
    .orderBy(desc(memories.createdAt))
    .limit(5)

  if (pending.length > 0) {
    console.log('\nRecent Pending Memories:')
    for (const m of pending) {
      const age = Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 1000)
      const ageStr = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`
      console.log(`  [${m.namespace.padEnd(10)}] ${m.id.slice(0, 8)}... (${ageStr})`)
      console.log(`    ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}`)
    }
  }

  // Recent failures
  const failed = await db
    .select({
      id: memories.id,
      namespace: memories.namespace,
      content: memories.content,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(eq(memories.embeddingStatus, 'failed'))
    .orderBy(desc(memories.createdAt))
    .limit(5)

  if (failed.length > 0) {
    console.log('\nRecent Failures:')
    for (const m of failed) {
      console.log(`  [${m.namespace.padEnd(10)}] ${m.id.slice(0, 8)}...`)
      console.log(`    ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}`)
    }
  }

  // By namespace
  const byNamespace = await db
    .select({
      namespace: memories.namespace,
      total: sql<number>`cast(count(*) as int)`,
      ready: sql<number>`cast(sum(case when embedding_status = 'ready' then 1 else 0 end) as int)`,
      pending: sql<number>`cast(sum(case when embedding_status = 'pending' then 1 else 0 end) as int)`,
      failed: sql<number>`cast(sum(case when embedding_status = 'failed' then 1 else 0 end) as int)`,
    })
    .from(memories)
    .groupBy(memories.namespace)

  console.log('\nBy Namespace:')
  for (const ns of byNamespace) {
    const readyPct = ns.total > 0 ? Math.round((ns.ready / ns.total) * 100) : 0
    console.log(`  ${ns.namespace.padEnd(15)} ${ns.total.toString().padStart(4)} total  (${readyPct}% ready, ${ns.pending} pending, ${ns.failed} failed)`)
  }

  console.log()
}

main()
