/**
 * Swarm Run Management
 *
 * Orchestrates multi-phase swarm runs: discovery -> analysis -> synthesis -> optimization.
 * Each phase creates agent_tasks for the assigned agents, events track progress.
 *
 * SECURITY: user_id derived from session JWT, never from client payload.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── Constants ────────────────────────────────────────────────────

const PHASE_ORDER = ['discovery', 'analysis', 'synthesis', 'optimization'] as const
type SwarmPhase = (typeof PHASE_ORDER)[number]

const EVENT_RETENTION_DAYS = 30

function expiresAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + EVENT_RETENTION_DAYS)
  return d.toISOString()
}

// ── Emit event helper ────────────────────────────────────────────

async function emitEvent(params: {
  userId: string
  type: string
  swarmRunId: string
  message: string
  data?: Record<string, unknown>
}) {
  await supabase.from('events').insert({
    user_id: params.userId,
    type: params.type,
    swarm_run_id: params.swarmRunId,
    message: params.message,
    data: params.data ?? {},
    expires_at: expiresAt(),
  })
}

// ── Start swarm ──────────────────────────────────────────────────

export async function startSwarm(
  userId: string,
  config: {
    agentIds: string[]
    phaseAssignments: Record<string, string[]>
  },
) {
  // Create swarm run
  const { data: run, error: runError } = await supabase
    .from('swarm_runs')
    .insert({
      user_id: userId,
      status: 'queued',
      phase: 'discovery',
      config,
    })
    .select('id')
    .single()

  if (runError || !run) throw runError ?? new Error('Failed to create swarm run')

  const swarmRunId = run.id as string

  // Create agent_tasks for discovery-phase agents
  const discoveryAgentIds = config.phaseAssignments['discovery'] ?? []
  const tasks = discoveryAgentIds.map((agentId) => ({
    swarm_run_id: swarmRunId,
    agent_id: agentId,
    status: 'pending' as const,
    phase: 'discovery' as const,
    input: {
      prompt: 'Execute discovery phase',
      context: JSON.stringify(config),
    },
  }))

  let tasksCreated = 0
  if (tasks.length > 0) {
    const { error: taskError } = await supabase
      .from('agent_tasks')
      .insert(tasks)

    if (taskError) throw taskError
    tasksCreated = tasks.length
  }

  await emitEvent({
    userId,
    type: 'swarm-start',
    swarmRunId,
    message: `Swarm started with ${config.agentIds.length} agents`,
    data: { phase: 'discovery', tasksCreated },
  })

  return { swarmRunId, tasksCreated }
}

// ── Stop swarm ───────────────────────────────────────────────────

export async function stopSwarm(userId: string, swarmRunId: string) {
  // Set swarm run to failed
  const { error: runError } = await supabase
    .from('swarm_runs')
    .update({ status: 'failed' })
    .eq('id', swarmRunId)
    .eq('user_id', userId)

  if (runError) throw runError

  // Set all non-completed tasks to error
  const { error: taskError } = await supabase
    .from('agent_tasks')
    .update({ status: 'error', last_error: 'Swarm stopped by user' })
    .eq('swarm_run_id', swarmRunId)
    .neq('status', 'completed')

  if (taskError) throw taskError

  await emitEvent({
    userId,
    type: 'swarm-stop',
    swarmRunId,
    message: 'Swarm stopped by user',
  })

  return { stopped: true }
}

// ── Advance phase ────────────────────────────────────────────────

export async function advancePhase(swarmRunId: string) {
  // Get current swarm run
  const { data: run, error: runError } = await supabase
    .from('swarm_runs')
    .select('id, user_id, phase, config, status')
    .eq('id', swarmRunId)
    .single()

  if (runError || !run) throw runError ?? new Error('Swarm run not found')
  if (run.status === 'completed' || run.status === 'failed') {
    return { advanced: false, reason: `Swarm already ${run.status}` }
  }

  const currentPhase = run.phase as SwarmPhase
  const userId = run.user_id as string
  const config = run.config as {
    agentIds: string[]
    phaseAssignments: Record<string, string[]>
  } | null

  // Check all tasks in current phase are completed
  const { data: pendingTasks } = await supabase
    .from('agent_tasks')
    .select('id')
    .eq('swarm_run_id', swarmRunId)
    .eq('phase', currentPhase)
    .neq('status', 'completed')

  if (pendingTasks && pendingTasks.length > 0) {
    return {
      advanced: false,
      reason: `${pendingTasks.length} tasks still pending in ${currentPhase}`,
    }
  }

  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  const isFinalPhase = currentIndex >= PHASE_ORDER.length - 1

  // Emit phase-complete event
  await emitEvent({
    userId,
    type: 'swarm-phase-complete',
    swarmRunId,
    message: `Phase "${currentPhase}" completed`,
    data: { phase: currentPhase },
  })

  if (isFinalPhase) {
    // All phases done — mark completed
    await supabase
      .from('swarm_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', swarmRunId)

    await emitEvent({
      userId,
      type: 'swarm-complete',
      swarmRunId,
      message: 'Swarm run completed all phases',
    })

    return { advanced: true, completed: true, phase: currentPhase }
  }

  // Advance to next phase
  const nextPhase = PHASE_ORDER[currentIndex + 1]

  await supabase
    .from('swarm_runs')
    .update({ phase: nextPhase, status: 'running' })
    .eq('id', swarmRunId)

  // Create tasks for next phase agents
  const nextAgentIds = config?.phaseAssignments[nextPhase] ?? []
  let tasksCreated = 0

  if (nextAgentIds.length > 0) {
    const tasks = nextAgentIds.map((agentId) => ({
      swarm_run_id: swarmRunId,
      agent_id: agentId,
      status: 'pending' as const,
      phase: nextPhase,
      input: {
        prompt: `Execute ${nextPhase} phase`,
        context: JSON.stringify(config),
      },
    }))

    const { error: taskError } = await supabase
      .from('agent_tasks')
      .insert(tasks)

    if (taskError) throw taskError
    tasksCreated = tasks.length
  }

  await emitEvent({
    userId,
    type: 'swarm-phase-start',
    swarmRunId,
    message: `Phase "${nextPhase}" started with ${tasksCreated} tasks`,
    data: { phase: nextPhase, tasksCreated },
  })

  return { advanced: true, completed: false, phase: nextPhase, tasksCreated }
}

// ── Get swarm status ─────────────────────────────────────────────

export async function getSwarmStatus(userId: string, swarmRunId: string) {
  const { data: run, error: runError } = await supabase
    .from('swarm_runs')
    .select('*')
    .eq('id', swarmRunId)
    .eq('user_id', userId)
    .single()

  if (runError) throw runError

  const { data: tasks, error: taskError } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('swarm_run_id', swarmRunId)
    .order('created_at', { ascending: true })

  if (taskError) throw taskError

  return { run, tasks: tasks ?? [] }
}

// ── List swarm runs ──────────────────────────────────────────────

export async function listSwarmRuns(userId: string) {
  const { data, error } = await supabase
    .from('swarm_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}
