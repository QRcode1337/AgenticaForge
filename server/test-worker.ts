/**
 * Test Embedding Worker
 *
 * Creates test memories and verifies the worker processes them.
 * Run: npx tsx server/test-worker.ts
 */

import 'dotenv/config'
import { db } from './db/index.js'
import { memories } from './db/schema.js'
import { eq } from 'drizzle-orm'

const TEST_USER_ID = 'bef34120-8609-40ab-bab6-28c3290c7a16' // patrick@agentforge.dev

const TEST_MEMORIES = [
  {
    content: 'AgentForge is an in-browser AI agent orchestration dashboard with real memory engine.',
    namespace: 'test',
    type: 'fact' as const,
  },
  {
    content: 'The memory engine implements TF-IDF vectorization and HNSW approximate nearest-neighbor search.',
    namespace: 'test',
    type: 'fact' as const,
  },
  {
    content: 'Swarm simulator runs 15 agents through 4 phases: discovery, analysis, synthesis, optimization.',
    namespace: 'test',
    type: 'fact' as const,
  },
  {
    content: 'Tech stack: React 19, TypeScript 5.9, Vite 7, Tailwind 4, Three.js, Recharts.',
    namespace: 'test',
    type: 'fact' as const,
  },
  {
    content: 'All state persists across page reloads via IndexedDB with debounced writes.',
    namespace: 'test',
    type: 'fact' as const,
  },
]

async function createTestMemories() {
  console.log('\n=== Creating Test Memories ===\n')

  const created = []

  for (const mem of TEST_MEMORIES) {
    const [result] = await db
      .insert(memories)
      .values({
        userId: TEST_USER_ID,
        content: mem.content,
        namespace: mem.namespace,
        type: mem.type,
        origin: 'human',
        visibility: 'private',
        tier: 'hot',
        score: 1.0,
        embeddingStatus: 'pending',
      })
      .returning({ id: memories.id })

    created.push(result.id)
    console.log(`  ✅ Created: ${result.id.slice(0, 8)}...`)
    console.log(`     ${mem.content.slice(0, 80)}...`)
  }

  console.log(`\n✨ Created ${created.length} test memories`)
  console.log('\n📊 Run `npx tsx server/worker-status.ts` to check status')
  console.log('🚀 Run `npx tsx server/worker/src/embedding-worker.ts` to process them')
  console.log()

  return created
}

async function checkMemoryStatus(memoryIds: string[]) {
  console.log('\n=== Checking Memory Status ===\n')

  for (const id of memoryIds) {
    const [mem] = await db
      .select({
        id: memories.id,
        embeddingStatus: memories.embeddingStatus,
        embeddingModel: memories.embeddingModel,
        content: memories.content,
      })
      .from(memories)
      .where(eq(memories.id, id))

    if (mem) {
      const status = mem.embeddingStatus === 'ready' ? '✅' : mem.embeddingStatus === 'pending' ? '⏳' : '❌'
      console.log(`  ${status} ${mem.id.slice(0, 8)}... [${mem.embeddingStatus}]${mem.embeddingModel ? ` (${mem.embeddingModel})` : ''}`)
      console.log(`     ${mem.content.slice(0, 80)}...`)
    }
  }

  console.log()
}

async function cleanupTestMemories() {
  console.log('\n=== Cleaning Up Test Memories ===\n')

  const result = await db
    .delete(memories)
    .where(eq(memories.namespace, 'test'))
    .returning({ id: memories.id })

  console.log(`  🗑️  Deleted ${result.length} test memories`)
  console.log()
}

async function main() {
  const command = process.argv[2]

  if (command === 'create') {
    await createTestMemories()
  } else if (command === 'check') {
    // Get all test memories
    const testMems = await db
      .select({ id: memories.id })
      .from(memories)
      .where(eq(memories.namespace, 'test'))

    if (testMems.length === 0) {
      console.log('\n❌ No test memories found. Run `npx tsx server/test-worker.ts create` first.\n')
      return
    }

    await checkMemoryStatus(testMems.map((m) => m.id))
  } else if (command === 'cleanup') {
    await cleanupTestMemories()
  } else {
    console.log('\nUsage:')
    console.log('  npx tsx server/test-worker.ts create   - Create test memories')
    console.log('  npx tsx server/test-worker.ts check    - Check embedding status')
    console.log('  npx tsx server/test-worker.ts cleanup  - Delete test memories')
    console.log()
  }
}

main()
