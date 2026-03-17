/**
 * Launch a real multi-agent research swarm.
 *
 * Topology:
 *   Phase 1 (discovery):  Scout-1 + Scout-2 — web research + memory_store
 *   Phase 2 (analysis):   Analyst-1 — memory_search + deeper analysis
 *   Phase 3 (synthesis):  Coordinator — memory_search + final report
 *
 * Run: npx tsx server/run-swarm.ts "your research topic here"
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const TOPIC = process.argv[2] || 'AI agent frameworks in 2026: LangGraph vs CrewAI vs AutoGen vs custom approaches'
const USER_ID = 'bef34120-8609-40ab-bab6-28c3290c7a16' // patrick@agentforge.dev

async function main() {
  console.log('\n=== AgentForge Research Swarm ===\n')
  console.log(`Topic: ${TOPIC}`)
  console.log(`User:  ${USER_ID.slice(0, 8)}...\n`)

  // ── 1. Create Agents ────────────────────────────────────────
  console.log('Creating agents...')

  const agentDefs = [
    {
      name: 'Scout-1',
      role: 'scout' as const,
      system_prompt:
        'You are Scout-1, a reconnaissance agent specializing in technology research. ' +
        'Your mission: search the web for current, factual information on the given topic. ' +
        'Focus on: key players, recent developments, adoption trends, and technical capabilities. ' +
        'After researching, use memory_store to save your 3 most important findings as separate memories ' +
        'in the "research" namespace. Each memory should be a concise, factual statement (1-2 sentences). ' +
        'End with a brief status report.',
      tools: ['web_search', 'memory_store'],
    },
    {
      name: 'Scout-2',
      role: 'scout' as const,
      system_prompt:
        'You are Scout-2, a reconnaissance agent specializing in competitive analysis. ' +
        'Your mission: search the web for comparisons, benchmarks, developer opinions, and limitations ' +
        'of the technologies in the given topic. Focus on: trade-offs, weaknesses, community sentiment, ' +
        'and real-world production use cases. ' +
        'After researching, use memory_store to save your 3 most important findings as separate memories ' +
        'in the "research" namespace. Each memory should be a concise, factual statement (1-2 sentences). ' +
        'End with a brief status report.',
      tools: ['web_search', 'memory_store'],
    },
    {
      name: 'Analyst-1',
      role: 'specialist' as const,
      system_prompt:
        'You are Analyst-1, a specialist in technology analysis. ' +
        'Your mission: use memory_search to retrieve all findings stored by the scout agents ' +
        'in the "research" namespace. Analyze the findings for patterns, contradictions, and gaps. ' +
        'Then use memory_store to save your analysis as 2-3 structured insights in the "analysis" namespace. ' +
        'Each insight should identify a key theme or recommendation. ' +
        'End with a summary of what you found and your confidence level.',
      tools: ['memory_search', 'memory_store'],
    },
    {
      name: 'Coordinator',
      role: 'coordinator' as const,
      system_prompt:
        'You are Coordinator, the swarm lead responsible for final synthesis. ' +
        'Your mission: use memory_search to retrieve all findings from both "research" and "analysis" namespaces. ' +
        'Synthesize everything into a clear, actionable executive briefing. ' +
        'Structure your report as: ' +
        '1) Executive Summary (2-3 sentences) ' +
        '2) Key Findings (bullet points) ' +
        '3) Recommendation (which approach to choose and why) ' +
        '4) Risks & Considerations ' +
        'Use memory_store to save the final report in the "reports" namespace. ' +
        'Then present the full report as your response.',
      tools: ['memory_search', 'memory_store'],
    },
  ]

  const agentIds: Record<string, string> = {}

  for (const def of agentDefs) {
    const { data, error } = await sb
      .from('agents')
      .insert({ user_id: USER_ID, ...def, model: 'claude-sonnet-4-5-20250929' })
      .select('id')
      .single()

    if (error) throw new Error(`Agent ${def.name}: ${error.message}`)
    agentIds[def.name] = data.id
    console.log(`  ${def.role.padEnd(12)} ${def.name} → ${data.id.slice(0, 8)}...`)
  }

  // ── 2. Create Swarm Run ─────────────────────────────────────
  console.log('\nCreating swarm run...')

  const { data: run, error: runError } = await sb
    .from('swarm_runs')
    .insert({
      user_id: USER_ID,
      status: 'running',
      phase: 'discovery',
      config: {
        name: 'Technology Research Swarm',
        topic: TOPIC,
        agents: Object.keys(agentIds),
        phases: ['discovery', 'analysis', 'synthesis'],
      },
    })
    .select('id')
    .single()

  if (runError) throw runError
  console.log(`  Swarm Run: ${run.id}`)

  // ── 3. Emit launch event ────────────────────────────────────
  await sb.from('events').insert({
    user_id: USER_ID,
    type: 'swarm_started',
    swarm_run_id: run.id,
    message: `Research swarm launched: "${TOPIC}"`,
    data: { topic: TOPIC, agentCount: agentDefs.length },
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // ── 4. Create Tasks (phased) ────────────────────────────────
  console.log('\nCreating tasks...\n')

  // Phase 1: Discovery — two scouts search in parallel
  const discoveryTasks = [
    {
      agent: 'Scout-1',
      prompt: `MISSION BRIEFING: Research the following topic and gather intelligence.\n\nTOPIC: ${TOPIC}\n\nFocus on: key players, capabilities, recent developments (2025-2026), and adoption trends.\nStore your top 3 findings in memory (namespace: "research").`,
    },
    {
      agent: 'Scout-2',
      prompt: `MISSION BRIEFING: Research the following topic from a critical/comparative angle.\n\nTOPIC: ${TOPIC}\n\nFocus on: trade-offs, limitations, developer complaints, production war stories, and benchmarks.\nStore your top 3 findings in memory (namespace: "research").`,
    },
  ]

  const taskIds: { phase: string; name: string; id: string }[] = []

  for (const t of discoveryTasks) {
    const { data, error } = await sb
      .from('agent_tasks')
      .insert({
        swarm_run_id: run.id,
        agent_id: agentIds[t.agent],
        status: 'pending',
        phase: 'discovery',
        input: { prompt: t.prompt },
      })
      .select('id')
      .single()

    if (error) throw new Error(`Task ${t.agent}: ${error.message}`)
    taskIds.push({ phase: 'discovery', name: t.agent, id: data.id })
    console.log(`  [discovery]  ${t.agent} → ${data.id.slice(0, 8)}... (PENDING)`)
  }

  // Phase 2: Analysis — runs after scouts finish
  const { data: analysisTask, error: analysisError } = await sb
    .from('agent_tasks')
    .insert({
      swarm_run_id: run.id,
      agent_id: agentIds['Analyst-1'],
      status: 'pending',
      phase: 'analysis',
      input: {
        prompt:
          `ANALYSIS BRIEFING: The scout agents have completed reconnaissance on: "${TOPIC}"\n\n` +
          'Use memory_search with query "research findings" to retrieve their stored intelligence.\n' +
          'Analyze for patterns, contradictions, and gaps.\n' +
          'Store your 2-3 key insights in memory (namespace: "analysis").',
      },
    })
    .select('id')
    .single()

  if (analysisError) throw analysisError
  taskIds.push({ phase: 'analysis', name: 'Analyst-1', id: analysisTask.id })
  console.log(`  [analysis]   Analyst-1 → ${analysisTask.id.slice(0, 8)}... (PENDING)`)

  // Phase 3: Synthesis — coordinator produces final report
  const { data: synthTask, error: synthError } = await sb
    .from('agent_tasks')
    .insert({
      swarm_run_id: run.id,
      agent_id: agentIds['Coordinator'],
      status: 'pending',
      phase: 'synthesis',
      input: {
        prompt:
          `SYNTHESIS BRIEFING: All agents have completed their work on: "${TOPIC}"\n\n` +
          'Use memory_search to retrieve findings from "research" and "analysis" namespaces.\n' +
          'Produce a final executive briefing with:\n' +
          '1) Executive Summary\n2) Key Findings\n3) Recommendation\n4) Risks & Considerations\n\n' +
          'Save the final report to memory (namespace: "reports").\n' +
          'Present the full report as your response.',
      },
    })
    .select('id')
    .single()

  if (synthError) throw synthError
  taskIds.push({ phase: 'synthesis', name: 'Coordinator', id: synthTask.id })
  console.log(`  [synthesis]  Coordinator → ${synthTask.id.slice(0, 8)}... (PENDING)`)

  // ── 5. Summary ──────────────────────────────────────────────
  console.log('\n=== Swarm Launched ===\n')
  console.log('4 tasks queued across 3 phases.')
  console.log('Worker will execute them in queue order.\n')
  console.log('Watch progress:')
  console.log('  - Browser:  http://localhost:3000/ (Live Feed panel)')
  console.log(`  - CLI:      npx tsx server/check-swarm.ts ${run.id}`)
  console.log('  - Worker:   check worker terminal output\n')

  // ── 6. Write check script ───────────────────────────────────
  const checkScript = `import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const SWARM_ID = process.argv[2] || '${run.id}'
const USER_ID = '${USER_ID}'

async function main() {
  // Tasks
  const { data: tasks } = await sb
    .from('agent_tasks')
    .select('id, phase, status, tokens_used, last_error, output, completed_at, agents(name)')
    .eq('swarm_run_id', SWARM_ID)
    .order('created_at', { ascending: true })

  console.log('\\n=== Swarm Tasks ===\\n')
  for (const t of tasks ?? []) {
    const agent = (t as any).agents?.name ?? '?'
    const status = t.status.padEnd(10)
    const tokens = t.tokens_used ? \`\${t.tokens_used} tok\` : ''
    console.log(\`  [\${t.phase.padEnd(12)}] \${agent.padEnd(14)} \${status} \${tokens}\`)
    if (t.last_error) console.log(\`               ERROR: \${t.last_error}\`)
  }

  // Events
  const { data: events } = await sb
    .from('events')
    .select('type, agent_name, message, created_at')
    .eq('swarm_run_id', SWARM_ID)
    .order('created_at', { ascending: true })

  console.log('\\n=== Events ===\\n')
  for (const e of events ?? []) {
    const time = new Date(e.created_at).toLocaleTimeString()
    console.log(\`  \${time}  [\${e.type}] \${e.message}\`)
  }

  // Memories
  const { data: memories } = await sb
    .from('memories')
    .select('namespace, content, embedding_status')
    .eq('user_id', USER_ID)
    .in('namespace', ['research', 'analysis', 'reports'])
    .order('created_at', { ascending: true })

  console.log('\\n=== Shared Memory ===\\n')
  for (const m of memories ?? []) {
    console.log(\`  [\${m.namespace}] (\${m.embedding_status}) \${m.content?.slice(0, 120)}\`)
  }

  // Final report
  const report = memories?.find((m) => m.namespace === 'reports')
  if (report) {
    console.log('\\n=== FINAL REPORT ===\\n')
    console.log(report.content)
  }

  // Check if all complete
  const allDone = tasks?.every((t) => t.status === 'completed' || t.status === 'error')
  if (allDone) {
    console.log('\\n=== ALL TASKS COMPLETE ===')

    // Show coordinator output
    const coordTask = tasks?.find((t) => (t as any).agents?.name === 'Coordinator')
    if (coordTask?.output) {
      const output = coordTask.output as { response?: string }
      if (output.response) {
        console.log('\\n=== COORDINATOR RESPONSE ===\\n')
        console.log(output.response)
      }
    }
  } else {
    const pending = tasks?.filter((t) => t.status === 'pending').length ?? 0
    const active = tasks?.filter((t) => t.status === 'active').length ?? 0
    const done = tasks?.filter((t) => t.status === 'completed').length ?? 0
    console.log(\`\\nProgress: \${done}/\${tasks?.length} complete, \${active} active, \${pending} pending\`)
  }
  console.log()
}

main()
`

  const { writeFileSync } = await import('fs')
  writeFileSync(new URL('./check-swarm.ts', import.meta.url), checkScript)
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
