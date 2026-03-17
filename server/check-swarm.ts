import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const SWARM_ID = process.argv[2] || '31b06dc7-7aac-4065-927d-49a1e389f510'
const USER_ID = 'bef34120-8609-40ab-bab6-28c3290c7a16'

async function main() {
  // Tasks
  const { data: tasks } = await sb
    .from('agent_tasks')
    .select('id, phase, status, tokens_used, last_error, output, completed_at, agents(name)')
    .eq('swarm_run_id', SWARM_ID)
    .order('created_at', { ascending: true })

  console.log('\n=== Swarm Tasks ===\n')
  for (const t of tasks ?? []) {
    const agent = (t as any).agents?.name ?? '?'
    const status = t.status.padEnd(10)
    const tokens = t.tokens_used ? `${t.tokens_used} tok` : ''
    console.log(`  [${t.phase.padEnd(12)}] ${agent.padEnd(14)} ${status} ${tokens}`)
    if (t.last_error) console.log(`               ERROR: ${t.last_error}`)
  }

  // Events
  const { data: events } = await sb
    .from('events')
    .select('type, agent_name, message, created_at')
    .eq('swarm_run_id', SWARM_ID)
    .order('created_at', { ascending: true })

  console.log('\n=== Events ===\n')
  for (const e of events ?? []) {
    const time = new Date(e.created_at).toLocaleTimeString()
    console.log(`  ${time}  [${e.type}] ${e.message}`)
  }

  // Memories
  const { data: memories } = await sb
    .from('memories')
    .select('namespace, content, embedding_status')
    .eq('user_id', USER_ID)
    .in('namespace', ['research', 'analysis', 'reports'])
    .order('created_at', { ascending: true })

  console.log('\n=== Shared Memory ===\n')
  for (const m of memories ?? []) {
    console.log(`  [${m.namespace}] (${m.embedding_status}) ${m.content?.slice(0, 120)}`)
  }

  // Final report
  const report = memories?.find((m) => m.namespace === 'reports')
  if (report) {
    console.log('\n=== FINAL REPORT ===\n')
    console.log(report.content)
  }

  // Check if all complete
  const allDone = tasks?.every((t) => t.status === 'completed' || t.status === 'error')
  if (allDone) {
    console.log('\n=== ALL TASKS COMPLETE ===')

    // Show coordinator output
    const coordTask = tasks?.find((t) => (t as any).agents?.name === 'Coordinator')
    if (coordTask?.output) {
      const output = coordTask.output as { response?: string }
      if (output.response) {
        console.log('\n=== COORDINATOR RESPONSE ===\n')
        console.log(output.response)
      }
    }
  } else {
    const pending = tasks?.filter((t) => t.status === 'pending').length ?? 0
    const active = tasks?.filter((t) => t.status === 'active').length ?? 0
    const done = tasks?.filter((t) => t.status === 'completed').length ?? 0
    console.log(`\nProgress: ${done}/${tasks?.length} complete, ${active} active, ${pending} pending`)
  }
  console.log()
}

main()
