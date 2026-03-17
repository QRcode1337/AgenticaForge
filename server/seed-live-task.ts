/**
 * Seed a live LLM task for the worker to pick up.
 * Creates: test user → agent → swarm run → pending task
 *
 * Run: npx tsx server/seed-live-task.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  console.log('\n=== Seeding Live LLM Task ===\n')

  // 1. Create test user
  const email = `live-test-${Date.now()}@agentforge.test`
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: 'live-test-2026',
    email_confirm: true,
  })
  if (userError) throw userError
  const userId = userData.user.id
  console.log(`User:  ${userId}`)

  // 2. Create agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      user_id: userId,
      name: 'Recon-1',
      role: 'scout',
      system_prompt:
        'You are Recon-1, a scout agent in the AgentForge swarm. ' +
        'You specialize in reconnaissance and information gathering. ' +
        'Be concise. Use tactical language.',
      model: 'claude-sonnet-4-5-20250929',
      tools: ['web_search', 'memory_store'],
    })
    .select('id')
    .single()

  if (agentError) throw agentError
  console.log(`Agent: ${agent.id} (Recon-1)`)

  // 3. Create swarm run
  const { data: run, error: runError } = await supabase
    .from('swarm_runs')
    .insert({
      user_id: userId,
      status: 'running',
      phase: 'discovery',
      config: { name: 'Live E2E Test', objective: 'Verify agent execution pipeline' },
    })
    .select('id')
    .single()

  if (runError) throw runError
  console.log(`Swarm: ${run.id}`)

  // 4. Create pending task — worker will claim this
  const { data: task, error: taskError } = await supabase
    .from('agent_tasks')
    .insert({
      swarm_run_id: run.id,
      agent_id: agent.id,
      status: 'pending',
      phase: 'discovery',
      input: {
        prompt:
          'Recon-1, this is your first live mission. ' +
          'Report your status and confirm all systems are operational. ' +
          'Use the memory_store tool to save a memory with namespace "mission-log" ' +
          'containing your status report. Keep it under 50 words.',
      },
    })
    .select('id')
    .single()

  if (taskError) throw taskError
  console.log(`Task:  ${task.id} (PENDING — worker will claim)`)

  // Output IDs for monitoring
  console.log('\n--- Monitor these ---')
  console.log(`User ID:      ${userId}`)
  console.log(`Agent ID:     ${agent.id}`)
  console.log(`Swarm Run ID: ${run.id}`)
  console.log(`Task ID:      ${task.id}`)
  console.log('\nWorker should claim within ~2 seconds...')
  console.log('Watch worker logs or run:')
  console.log(`  npx tsx server/check-task.ts ${task.id}`)

  // Write a check script
  const checkScript = `
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const taskId = process.argv[2] || '${task.id}'

async function check() {
  // Task status
  const { data: task } = await supabase
    .from('agent_tasks')
    .select('status, attempts, tokens_used, output, last_error, completed_at')
    .eq('id', taskId)
    .single()

  console.log('\\n=== Task Status ===')
  console.log(JSON.stringify(task, null, 2))

  // Messages
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, tokens, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  console.log('\\n=== Messages ===')
  for (const msg of messages ?? []) {
    const preview = msg.content?.slice(0, 200) ?? '(no content)'
    console.log(\`  [\${msg.role}] \${preview}\`)
  }

  // Events
  const { data: events } = await supabase
    .from('events')
    .select('type, agent_name, message, created_at')
    .eq('swarm_run_id', '${run.id}')
    .order('created_at', { ascending: true })

  console.log('\\n=== Events ===')
  for (const evt of events ?? []) {
    console.log(\`  [\${evt.type}] \${evt.message}\`)
  }

  // Memories created
  const { data: memories } = await supabase
    .from('memories')
    .select('content, namespace, embedding_status, created_at')
    .eq('user_id', '${userId}')
    .order('created_at', { ascending: true })

  console.log('\\n=== Memories ===')
  for (const mem of memories ?? []) {
    console.log(\`  [\${mem.namespace}] \${mem.content?.slice(0, 150)} (embed: \${mem.embedding_status})\`)
  }
}

check().catch(console.error)
`

  const { writeFileSync } = await import('fs')
  writeFileSync(new URL('./check-task.ts', import.meta.url), checkScript)
  console.log('\ncheck-task.ts written for inspection.\n')
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
