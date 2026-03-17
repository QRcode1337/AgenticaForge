/**
 * AgentForge E2E Pipeline Test
 *
 * Tests the full flow: DB → Agent → Swarm → Task → Claim → Execute → Events
 * Run: npx tsx server/test-e2e.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Track created IDs for cleanup
const cleanup: { table: string; id: string }[] = []

async function step(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  [${name}] ... `)
  try {
    await fn()
    console.log('OK')
  } catch (err) {
    console.log('FAIL')
    console.error(`    ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }
}

async function main() {
  console.log('\n=== AgentForge E2E Pipeline Test ===\n')
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log()

  // ── Step 1: DB Connectivity ─────────────────────────────────
  console.log('1. Database Connectivity')

  let testUserId: string | null = null

  await step('connect', async () => {
    // Use service role to check we can reach the DB
    const { data, error } = await supabase.from('agents').select('id').limit(0)
    if (error) throw new Error(error.message)
  })

  // ── Step 2: Create test user via Auth Admin ─────────────────
  console.log('\n2. Auth — Create Test User')

  await step('create-user', async () => {
    const email = `e2e-test-${Date.now()}@agentforge.test`
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'test-password-e2e-2026',
      email_confirm: true,
    })
    if (error) throw new Error(error.message)
    testUserId = data.user.id
    console.log(`(user: ${testUserId.slice(0, 8)}...) `, '')
  })

  if (!testUserId) throw new Error('No test user created')

  // ── Step 3: Agent CRUD ──────────────────────────────────────
  console.log('\n3. Agent CRUD')

  let agentId: string | null = null

  await step('create-agent', async () => {
    const { data, error } = await supabase
      .from('agents')
      .insert({
        user_id: testUserId,
        name: 'E2E Scout',
        role: 'scout',
        system_prompt: 'You are a test agent. Respond with a single sentence confirming you are working.',
        model: 'claude-sonnet-4-5-20250929',
        tools: ['web_search', 'memory_store'],
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    agentId = data.id
    cleanup.push({ table: 'agents', id: agentId })
  })

  await step('read-agent', async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId!)
      .single()

    if (error) throw new Error(error.message)
    if (data.name !== 'E2E Scout') throw new Error(`Expected "E2E Scout", got "${data.name}"`)
  })

  // ── Step 4: Swarm Run ───────────────────────────────────────
  console.log('\n4. Swarm Run')

  let swarmRunId: string | null = null

  await step('create-swarm-run', async () => {
    const { data, error } = await supabase
      .from('swarm_runs')
      .insert({
        user_id: testUserId,
        status: 'running',
        phase: 'discovery',
        config: { test: true, name: 'E2E Test Run' },
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    swarmRunId = data.id
    cleanup.push({ table: 'swarm_runs', id: swarmRunId })
  })

  // ── Step 5: Task Creation ───────────────────────────────────
  console.log('\n5. Task Queue')

  let taskId: string | null = null

  await step('create-task', async () => {
    const { data, error } = await supabase
      .from('agent_tasks')
      .insert({
        swarm_run_id: swarmRunId,
        agent_id: agentId,
        status: 'pending',
        phase: 'discovery',
        input: {
          prompt: 'Say "E2E test successful" and nothing else.',
          context: 'This is an automated end-to-end test.',
        },
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    taskId = data.id
    cleanup.push({ table: 'agent_tasks', id: taskId })
  })

  // ── Step 6: Atomic Task Claiming ────────────────────────────
  console.log('\n6. Atomic Claim (RPC)')

  let leaseToken: string | null = null

  await step('claim_next_task', async () => {
    const { data, error } = await supabase.rpc('claim_next_task')
    if (error) throw new Error(`RPC error: ${error.message}`)
    if (!data) throw new Error('No task returned — queue might be empty')

    const claimed = data as { id: string; lease_token: string }
    if (claimed.id !== taskId) {
      console.log(`(claimed different task: ${claimed.id}) `, '')
    }
    leaseToken = claimed.lease_token
    if (!leaseToken) throw new Error('No lease_token returned')
  })

  await step('verify-claimed', async () => {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('status, lease_token, attempts')
      .eq('id', taskId!)
      .single()

    if (error) throw new Error(error.message)
    if (data.status !== 'active') throw new Error(`Expected status "active", got "${data.status}"`)
    if (data.lease_token !== leaseToken) throw new Error('Lease token mismatch')
    if (data.attempts !== 1) throw new Error(`Expected attempts=1, got ${data.attempts}`)
  })

  // ── Step 7: Events ──────────────────────────────────────────
  console.log('\n7. Events (Live Feed)')

  await step('emit-event', async () => {
    const { error } = await supabase.from('events').insert({
      user_id: testUserId,
      type: 'e2e_test',
      swarm_run_id: swarmRunId,
      agent_id: agentId,
      agent_name: 'E2E Scout',
      message: 'End-to-end pipeline test event',
      data: { test: true, timestamp: new Date().toISOString() },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error) throw new Error(error.message)
  })

  await step('read-events', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', testUserId!)
      .eq('type', 'e2e_test')

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('No events found')
  })

  // ── Step 8: Memory Store ────────────────────────────────────
  console.log('\n8. Memory Store')

  let memoryId: string | null = null

  await step('store-memory', async () => {
    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: testUserId,
        content: 'E2E test memory — pipeline verification complete.',
        namespace: 'e2e-test',
        tier: 'hot',
        type: 'fact',
        origin: 'agent',
        embedding_status: 'pending',
      })
      .select('id, embedding_status')
      .single()

    if (error) throw new Error(error.message)
    memoryId = data.id
    if (data.embedding_status !== 'pending') {
      throw new Error(`Expected embedding_status "pending", got "${data.embedding_status}"`)
    }
    cleanup.push({ table: 'memories', id: memoryId })
  })

  // ── Step 9: RPCs ────────────────────────────────────────────
  console.log('\n9. RPC Functions')

  await step('increment_access_count', async () => {
    const { error } = await supabase.rpc('increment_access_count', { row_id: memoryId })
    if (error) throw new Error(error.message)

    const { data } = await supabase
      .from('memories')
      .select('access_count')
      .eq('id', memoryId!)
      .single()

    if (data?.access_count !== 1) {
      throw new Error(`Expected access_count=1, got ${data?.access_count}`)
    }
  })

  await step('cleanup_expired_events', async () => {
    const { data, error } = await supabase.rpc('cleanup_expired_events')
    if (error) throw new Error(error.message)
    // Just verify it runs without error — returned count may be 0
  })

  // ── Step 10: Cleanup ────────────────────────────────────────
  console.log('\n10. Cleanup')

  // Release the claimed task first (set back to pending so cleanup works)
  await step('release-task', async () => {
    const { error } = await supabase
      .from('agent_tasks')
      .update({ status: 'completed', lease_token: null })
      .eq('id', taskId!)
    if (error) throw new Error(error.message)
  })

  // Delete test events
  await step('delete-events', async () => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('user_id', testUserId!)
      .eq('type', 'e2e_test')
    if (error) throw new Error(error.message)
  })

  // Delete in reverse dependency order
  for (const item of cleanup.reverse()) {
    await step(`delete-${item.table}`, async () => {
      const { error } = await supabase.from(item.table).delete().eq('id', item.id)
      if (error) throw new Error(error.message)
    })
  }

  // Delete test user
  await step('delete-user', async () => {
    const { error } = await supabase.auth.admin.deleteUser(testUserId!)
    if (error) throw new Error(error.message)
  })

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n=== ALL TESTS PASSED ===\n')
  console.log('Pipeline verified:')
  console.log('  DB connect → Auth → Agent CRUD → Swarm Run →')
  console.log('  Task Queue → Atomic Claim (RPC) → Events →')
  console.log('  Memory Store → RPCs → Cleanup')
  console.log()
}

main().catch((err) => {
  console.error('\n=== TEST FAILED ===\n')
  console.error(err)

  // Attempt cleanup on failure
  console.log('\nAttempting cleanup of test data...')
  Promise.all(
    cleanup.reverse().map(async (item) => {
      try {
        await supabase.from(item.table).delete().eq('id', item.id)
      } catch { /* ignore */ }
    }),
  ).finally(() => process.exit(1))
})
