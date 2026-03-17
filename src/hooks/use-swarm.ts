import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useMemory } from './use-memory.ts'
import { SwarmSimulator } from '../engine/swarm-simulator.ts'
import { supabase } from '../lib/supabase.ts'
import type { SwarmAgent, SwarmPhase } from '../engine/types.ts'

// ── Feature flag ──────────────────────────────────────────────────
const USE_BACKEND = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co',
)

// ── Types ─────────────────────────────────────────────────────────

export interface SwarmSnapshot {
  agents: SwarmAgent[]
  phase: SwarmPhase
  running: boolean
  loading: boolean
  currentRunId: string | null
  start: () => void
  stop: () => void
}

// ── Supabase row shapes ───────────────────────────────────────────

interface SwarmRunRow {
  id: string
  status: string
  phase: string
  created_at: string
}

interface AgentTaskRow {
  id: string
  swarm_run_id: string
  agent_id: string
  status: string
  phase: string
  input?: {
    prompt?: string
    context?: string
    tools?: string[]
    dependencies?: string[]
  } | null
  attempts?: number | null
  agents?: {
    name?: string | null
    role?: string | null
  } | null
}

interface AgentRow {
  id: string
  name: string
  role: SwarmAgent['role']
}

// ── Context ───────────────────────────────────────────────────────

const SwarmContext = createContext<SwarmSnapshot | null>(null)

// ── Provider (backend mode) ───────────────────────────────────────

function BackendSwarmProvider({ children }: { children: ReactNode }) {
  const [currentRun, setCurrentRun] = useState<SwarmRunRow | null>(null)
  const [tasks, setTasks] = useState<AgentTaskRow[]>([])
  const [loading, setLoading] = useState(true)

  // Load active run on mount
  useEffect(() => {
    let cancelled = false

    async function loadActiveRun() {
      // Load most recent run (any status) so completed swarms still show
      const { data, error } = await supabase
        .from('swarm_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (cancelled) return
      if (error) {
        console.error('[use-swarm] Failed to load active run:', error.message)
        setLoading(false)
        return
      }

      const run = data?.[0] ?? null
      setCurrentRun(run)

      if (run) {
        // Load tasks with agent name from the agents table
        const { data: taskData } = await supabase
          .from('agent_tasks')
          .select('*, agents(name, role)')
          .eq('swarm_run_id', run.id)

        if (!cancelled && taskData) {
          setTasks(taskData as AgentTaskRow[])
        }
      }

      setLoading(false)
    }

    void loadActiveRun()
    return () => { cancelled = true }
  }, [])

  // Subscribe to swarm_runs changes
  useEffect(() => {
    const channel = supabase
      .channel('swarm-runs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swarm_runs' },
        (payload) => {
          const row = payload.new as SwarmRunRow | undefined
          if (!row) return

          if (row.status === 'running' || row.status === 'pending') {
            setCurrentRun(row)
          } else if (currentRun && row.id === currentRun.id) {
            // Run completed or failed
            setCurrentRun((prev) => prev?.id === row.id ? row : prev)
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentRun])

  // Subscribe to agent_tasks changes
  useEffect(() => {
    if (!currentRun) return

    const runId = currentRun.id
    const channel = supabase
      .channel('agent-tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_tasks', filter: `swarm_run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as AgentTaskRow | undefined
          if (!row) return

          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === row.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = { ...next[idx], ...row }
              return next
            }
            return [...prev, row]
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentRun])

  // Map tasks to SwarmAgent[]
  const agents: SwarmAgent[] = tasks.map((t) => {
    const role = (t.agents?.role as SwarmAgent['role'] | undefined) ?? 'worker'
    const input = t.input ?? null
    const status = t.status as SwarmAgent['status']
    const utilization =
      status === 'completed' ? 100 :
      status === 'active' ? 65 :
      status === 'error' ? 0 :
      20

    return {
      id: t.agent_id,
      name: t.agents?.name ?? `Agent ${t.agent_id.slice(0, 8)}`,
      role,
      status,
      phase: t.phase as SwarmPhase,
      domain: input?.context ?? role,
      utilization,
      ticksRemaining: status === 'completed' || status === 'error' ? 0 : Math.max(1, 4 - (t.attempts ?? 0)),
      dependencies: input?.dependencies ?? [],
    }
  })

  const phase: SwarmPhase = (currentRun?.phase as SwarmPhase) ?? 'discovery'
  const running = currentRun?.status === 'running'

  const start = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.error('[use-swarm] Not authenticated')
        return
      }

      const { data: run, error: runError } = await supabase
        .from('swarm_runs')
        .insert({
          user_id: session.user.id,
          status: 'running',
          phase: 'discovery',
        })
        .select()
        .single()

      if (runError || !run) {
        console.error('[use-swarm] Failed to create swarm run:', runError?.message)
        return
      }

      setCurrentRun(run)

      const { data: existingAgents, error: agentQueryError } = await supabase
        .from('agents')
        .select('id, name, role')
        .eq('user_id', session.user.id)

      if (agentQueryError) {
        console.error('[use-swarm] Failed to load agents:', agentQueryError.message)
        return
      }

      const defaultAgents: Array<{
        name: string
        role: SwarmAgent['role']
        system_prompt: string
        tools: string[]
        context: string
      }> = [
        {
          name: 'Scout Alpha',
          role: 'scout',
          system_prompt: 'Explore reasoning pathways and extract viable approaches.',
          tools: ['web_search'],
          context: 'reasoning',
        },
        {
          name: 'Scout Beta',
          role: 'scout',
          system_prompt: 'Identify tool-first execution plans and dependencies.',
          tools: ['web_search', 'code_exec'],
          context: 'tools',
        },
        {
          name: 'Scout Gamma',
          role: 'scout',
          system_prompt: 'Collect critical signals and detect contradictions early.',
          tools: ['web_search'],
          context: 'signals',
        },
        {
          name: 'Recon One',
          role: 'scout',
          system_prompt: 'Synthesize memory and prior run context for fast ramp-up.',
          tools: ['memory_ops'],
          context: 'memory',
        },
      ]

      let agentsForRun = (existingAgents ?? []) as AgentRow[]
      if (agentsForRun.length === 0) {
        const { data: createdAgents, error: createAgentsError } = await supabase
          .from('agents')
          .insert(defaultAgents.map((agent) => ({
            user_id: session.user.id,
            name: agent.name,
            role: agent.role,
            system_prompt: agent.system_prompt,
            tools: agent.tools,
            config: { default: true, source: 'swarm-start', context: agent.context },
          })))
          .select('id, name, role')

        if (createAgentsError || !createdAgents) {
          console.error('[use-swarm] Failed to create default agents:', createAgentsError?.message)
          return
        }
        agentsForRun = createdAgents as AgentRow[]
      }

      const taskRows = agentsForRun.map((agent) => {
        const matchingDefault = defaultAgents.find((d) => d.name === agent.name)
        const context = matchingDefault?.context ?? agent.role
        const tools = matchingDefault?.tools ?? []
        return {
          swarm_run_id: run.id,
          agent_id: agent.id,
          phase: 'discovery',
          status: 'pending',
          input: {
            prompt: `Execute discovery for ${agent.name} (${agent.role})`,
            context,
            tools,
            dependencies: [],
          },
        }
      })

      const { error: taskError } = await supabase
        .from('agent_tasks')
        .insert(taskRows)

      if (taskError) {
        console.error('[use-swarm] Failed to create agent tasks:', taskError.message)
        return
      }

      const { data: createdTasks } = await supabase
        .from('agent_tasks')
        .select('*, agents(name, role)')
        .eq('swarm_run_id', run.id)

      if (createdTasks) {
        setTasks(createdTasks as AgentTaskRow[])
      }
    } catch (err) {
      console.error('[use-swarm] start() error:', err)
    }
  }, [])

  const stop = useCallback(async () => {
    if (!currentRun) return

    try {
      await supabase
        .from('swarm_runs')
        .update({ status: 'failed' })
        .eq('id', currentRun.id)

      await supabase
        .from('agent_tasks')
        .update({ status: 'error' })
        .eq('swarm_run_id', currentRun.id)
        .neq('status', 'completed')
    } catch (err) {
      console.error('[use-swarm] stop() error:', err)
    }
  }, [currentRun])

  const value: SwarmSnapshot = {
    agents,
    phase,
    running,
    loading,
    currentRunId: currentRun?.id ?? null,
    start,
    stop,
  }

  return createElement(SwarmContext.Provider, { value }, children)
}

// ── Provider (local/fallback mode) ────────────────────────────────

function LocalSwarmProvider({ children }: { children: ReactNode }) {
  const { engine } = useMemory()
  const [sim, setSim] = useState(() => new SwarmSimulator(engine))
  const [, tick] = useState(0)
  const simRef = useRef(sim)
  simRef.current = sim

  // Subscribe to simulator state changes
  useEffect(() => {
    const unsub = sim.subscribe(() => tick((v) => v + 1))
    return unsub
  }, [sim])

  // Cleanup on unmount
  useEffect(() => {
    return () => simRef.current.destroy()
  }, [])

  const start = useCallback(() => {
    if (sim.isRunning()) return

    // If simulation already completed, create a fresh instance
    const hasCompleted = sim.getAgents().some((a) => a.status === 'completed')
    if (hasCompleted) {
      sim.destroy()
      const fresh = new SwarmSimulator(engine)
      setSim(fresh)
      fresh.start()
    } else {
      sim.start()
      tick((v) => v + 1)
    }
  }, [sim, engine])

  const stop = useCallback(() => {
    sim.stop()
    tick((v) => v + 1)
  }, [sim])

  const value: SwarmSnapshot = {
    agents: sim.getAgents(),
    phase: sim.getCurrentPhase(),
    running: sim.isRunning(),
    loading: false,
    currentRunId: null,
    start,
    stop,
  }

  return createElement(SwarmContext.Provider, { value }, children)
}

// ── Composite Provider ────────────────────────────────────────────

export function SwarmProvider({ children }: { children: ReactNode }) {
  if (USE_BACKEND) {
    return createElement(BackendSwarmProvider, null, children)
  }
  return createElement(LocalSwarmProvider, null, children)
}

// ── Hook ──────────────────────────────────────────────────────────

export function useSwarm(): SwarmSnapshot {
  const ctx = useContext(SwarmContext)
  if (!ctx) throw new Error('useSwarm must be used within a <SwarmProvider>')
  return ctx
}
