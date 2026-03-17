
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const taskId = process.argv[2] || '2ceb1fdd-2dbf-4999-a531-272cee39d185'

async function check() {
  // Task status
  const { data: task } = await supabase
    .from('agent_tasks')
    .select('status, attempts, tokens_used, output, last_error, completed_at')
    .eq('id', taskId)
    .single()

  console.log('\n=== Task Status ===')
  console.log(JSON.stringify(task, null, 2))

  // Messages
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, tokens, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  console.log('\n=== Messages ===')
  for (const msg of messages ?? []) {
    const preview = msg.content?.slice(0, 200) ?? '(no content)'
    console.log(`  [${msg.role}] ${preview}`)
  }

  // Events
  const { data: events } = await supabase
    .from('events')
    .select('type, agent_name, message, created_at')
    .eq('swarm_run_id', '20629c2b-c0fc-4c6c-8801-65411629c6e7')
    .order('created_at', { ascending: true })

  console.log('\n=== Events ===')
  for (const evt of events ?? []) {
    console.log(`  [${evt.type}] ${evt.message}`)
  }

  // Memories created
  const { data: memories } = await supabase
    .from('memories')
    .select('content, namespace, embedding_status, created_at')
    .eq('user_id', 'e4943eee-d0c7-4d8c-b4ae-12a54c07a232')
    .order('created_at', { ascending: true })

  console.log('\n=== Memories ===')
  for (const mem of memories ?? []) {
    console.log(`  [${mem.namespace}] ${mem.content?.slice(0, 150)} (embed: ${mem.embedding_status})`)
  }
}

check().catch(console.error)
