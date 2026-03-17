import type { SwarmAgent, SwarmPhase, SwarmAgentRole } from './types.ts'

// ── Duck-typed engine interface (avoids circular imports) ────────
interface SimulableEngine {
  store(content: string, namespace: string, metadata?: Record<string, string>): unknown
  search(query: string, options?: { limit?: number }): unknown[]
  bus: {
    emit(
      type: string,
      message: string,
      data?: { agentId?: string; agentName?: string; extra?: Record<string, unknown> },
    ): void
  }
}

// ── Phase ordering ──────────────────────────────────────────────
const PHASE_ORDER: readonly SwarmPhase[] = [
  'discovery',
  'analysis',
  'synthesis',
  'optimization',
] as const

// ── Agent blueprint (static definition before randomized ticks) ─
interface AgentBlueprint {
  id: string
  name: string
  role: SwarmAgentRole
  phase: SwarmPhase
  domain: string
  dependencies: string[]
  operate: (engine: SimulableEngine) => void
}

// ── Content generators ──────────────────────────────────────────
// Each agent produces realistic memory content per tick.

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function confidence(): string {
  return (0.6 + Math.random() * 0.39).toFixed(2)
}

// Discovery phase: scouts store entries
const SCOUT_ALPHA_CONTENT = [
  `Memory pattern: temporal decay observed in session context with ${confidence()} confidence`,
  `Reasoning chain detected: hypothesis → evidence → conclusion loop at depth 3`,
  `Identified recursive reasoning pattern across 4 sequential interactions`,
  `Mapped causal chain: user intent → tool selection → output verification`,
  `Flagged anomalous reasoning branch at decision node 7, confidence ${confidence()}`,
] as const

const SCOUT_BETA_CONTENT = [
  `Tool usage spike: grep invocations increased 340% during analysis phase`,
  `Detected sequential read→edit→validate pattern in 78% of file operations`,
  `Tool affinity cluster: {Read, Grep, Edit} co-occur with ${confidence()} probability`,
  `Mapped tool dependency chain: Glob → Read → Edit → Bash (4-step pipeline)`,
  `Anomalous tool pattern: parallel writes to same namespace detected`,
] as const

const SCOUT_GAMMA_CONTENT = [
  `Signal path mapped: event-bus → subscriber → re-render with 12ms latency`,
  `Identified feedback loop in pattern-tracker → search → pattern-tracker cycle`,
  `Signal attenuation: 0.3 decay per hop across 5 intermediary nodes`,
  `Cross-namespace signal detected: reasoning → tools correlation ${confidence()}`,
  `Mapped broadcast topology: bus emits to ${Math.floor(3 + Math.random() * 8)} listeners`,
] as const

const RECON_01_CONTENT = [
  `Deep archive scan: recovered ${Math.floor(10 + Math.random() * 40)} cold-tier entries`,
  `Memory fragmentation index: ${(Math.random() * 0.4 + 0.1).toFixed(2)} across all namespaces`,
  `Archive integrity check passed for ${Math.floor(50 + Math.random() * 150)} entries`,
  `Historical access pattern: exponential decay with half-life ~4.2 minutes`,
  `Recovered orphaned vector entries: ${Math.floor(2 + Math.random() * 8)} without parent memories`,
] as const

// Analysis phase: analysts search then store
const ANALYSIS_QUERIES: Record<string, readonly string[]> = {
  'analyzer-01': ['reasoning chain', 'causal pattern', 'hypothesis loop'],
  'analyzer-02': ['tool usage', 'tool affinity', 'tool dependency'],
  'pattern-det': ['signal attenuation', 'feedback loop', 'signal path'],
  'classifier': ['memory fragmentation', 'archive integrity', 'cold-tier'],
} as const

const ANALYSIS_RESULTS: Record<string, readonly string[]> = {
  'analyzer-01': [
    `Classification: 3 distinct reasoning archetypes identified with separation score ${confidence()}`,
    `Pattern cluster: convergent reasoning dominates at 64% frequency`,
    `Identified 2 novel reasoning patterns not in baseline taxonomy`,
  ],
  'analyzer-02': [
    `Frequency map: Read (34%), Grep (28%), Edit (22%), Bash (16%) across sessions`,
    `Tool efficiency score: 0.82 — 18% of invocations produce no actionable output`,
    `Optimal tool sequence identified: Grep → Read → Edit (saves 2.1s avg)`,
  ],
  'pattern-det': [
    `Anomaly detected: signal variance exceeds 2σ threshold in 3 paths`,
    `False positive rate: ${(Math.random() * 0.05 + 0.01).toFixed(3)} across ${Math.floor(100 + Math.random() * 200)} signals`,
    `Flagged ${Math.floor(2 + Math.random() * 5)} anomalous signal cascades for review`,
  ],
  'classifier': [
    `Semantic clusters: ${Math.floor(4 + Math.random() * 6)} distinct memory groups via cosine similarity`,
    `Cluster coherence: ${confidence()} average intra-cluster similarity`,
    `Outlier entries: ${Math.floor(3 + Math.random() * 7)} memories unassigned to any cluster`,
  ],
} as const

// Synthesis phase: workers search + store
const SYNTHESIS_QUERIES: Record<string, readonly string[]> = {
  'synth-core': ['reasoning archetypes', 'pattern cluster', 'convergent reasoning'],
  'builder-01': ['tool efficiency', 'optimal tool sequence', 'tool frequency'],
  'builder-02': ['semantic clusters', 'cluster coherence', 'outlier entries'],
  'integrator': ['anomaly detected', 'signal cascade', 'false positive rate'],
} as const

const SYNTHESIS_RESULTS: Record<string, readonly string[]> = {
  'synth-core': [
    `Synthesized reasoning model v1: 3 archetypes × 4 contexts = 12 behavior modes`,
    `Cross-pattern correlation matrix computed: strongest link reasoning↔tools at ${confidence()}`,
    `Meta-pattern: reasoning depth inversely correlates with tool count (r=-0.67)`,
  ],
  'builder-01': [
    `Model v1 built: tool prediction accuracy ${confidence()} on held-out sessions`,
    `Feature importance: previous_tool (0.41), namespace (0.28), time_of_day (0.18), query_length (0.13)`,
    `Tool recommendation engine trained on ${Math.floor(200 + Math.random() * 300)} historical sequences`,
  ],
  'builder-02': [
    `Model v2 built: memory retrieval optimization reduces search time by ${Math.floor(15 + Math.random() * 25)}%`,
    `Tier prediction model: hot→warm transition accuracy ${confidence()}`,
    `Unified memory graph: ${Math.floor(50 + Math.random() * 100)} nodes, ${Math.floor(100 + Math.random() * 300)} edges`,
  ],
  'integrator': [
    `Integration test: all 3 models produce consistent output on ${Math.floor(90 + Math.random() * 10)}% of test cases`,
    `Signal-to-model bridge validated: anomaly flags correctly propagate to reasoning model`,
    `End-to-end latency: store → search → pattern-match → result in ${Math.floor(5 + Math.random() * 15)}ms`,
  ],
} as const

// Optimization phase: optimizers search all namespaces
const OPTIMIZER_QUERIES = [
  'model accuracy',
  'integration test',
  'tier prediction',
  'reasoning model',
  'tool prediction',
  'anomaly flags',
] as const

const OPTIMIZER_RESULTS = [
  `Weight optimization complete: global loss reduced by ${(Math.random() * 0.15 + 0.05).toFixed(3)}`,
  `Pruned ${Math.floor(5 + Math.random() * 15)} low-impact connections from HNSW graph`,
  `Rebalanced tier thresholds: hot=${(0.65 + Math.random() * 0.1).toFixed(2)}, warm=${(0.25 + Math.random() * 0.1).toFixed(2)}`,
] as const

const VALIDATOR_RESULTS = [
  `Validation pass: ${Math.floor(95 + Math.random() * 5)}% of assertions passed`,
  `Edge case coverage: ${Math.floor(85 + Math.random() * 12)}% — ${Math.floor(2 + Math.random() * 4)} gaps identified`,
  `Regression check: no performance degradation detected across ${Math.floor(10 + Math.random() * 20)} benchmarks`,
] as const

const QUEEN_RESULTS = [
  `Final coordination complete: all 15 agents converged, unified model confidence ${confidence()}`,
  `Swarm summary: ${Math.floor(40 + Math.random() * 60)} memories stored, ${Math.floor(20 + Math.random() * 30)} patterns identified, ${Math.floor(3 + Math.random() * 5)} models trained`,
  `Optimization delta: +${(Math.random() * 0.2 + 0.05).toFixed(2)} retrieval accuracy, -${Math.floor(10 + Math.random() * 20)}ms avg latency`,
] as const

// ── Agent blueprints ────────────────────────────────────────────
function createBlueprints(): AgentBlueprint[] {
  // Discovery phase IDs for dependency references
  const discoveryIds = ['scout-alpha', 'scout-beta', 'scout-gamma', 'recon-01']
  const analysisIds = ['analyzer-01', 'analyzer-02', 'pattern-det', 'classifier']
  const synthesisIds = ['synth-core', 'builder-01', 'builder-02', 'integrator']

  return [
    // ── Discovery Phase (4 scouts) ──────────────────────────────
    {
      id: 'scout-alpha',
      name: 'Scout Alpha',
      role: 'scout',
      phase: 'discovery',
      domain: 'reasoning',
      dependencies: [],
      operate(engine) {
        engine.store(pickRandom(SCOUT_ALPHA_CONTENT), 'reasoning', {
          source: 'scout-alpha',
          phase: 'discovery',
        })
      },
    },
    {
      id: 'scout-beta',
      name: 'Scout Beta',
      role: 'scout',
      phase: 'discovery',
      domain: 'tools',
      dependencies: [],
      operate(engine) {
        engine.store(pickRandom(SCOUT_BETA_CONTENT), 'tools', {
          source: 'scout-beta',
          phase: 'discovery',
        })
      },
    },
    {
      id: 'scout-gamma',
      name: 'Scout Gamma',
      role: 'scout',
      phase: 'discovery',
      domain: 'signals',
      dependencies: [],
      operate(engine) {
        engine.store(pickRandom(SCOUT_GAMMA_CONTENT), 'signals', {
          source: 'scout-gamma',
          phase: 'discovery',
        })
      },
    },
    {
      id: 'recon-01',
      name: 'Recon One',
      role: 'scout',
      phase: 'discovery',
      domain: 'memory',
      dependencies: [],
      operate(engine) {
        engine.store(pickRandom(RECON_01_CONTENT), 'memory', {
          source: 'recon-01',
          phase: 'discovery',
        })
      },
    },

    // ── Analysis Phase (4 specialists) ──────────────────────────
    {
      id: 'analyzer-01',
      name: 'Analyzer One',
      role: 'specialist',
      phase: 'analysis',
      domain: 'reasoning',
      dependencies: [...discoveryIds],
      operate(engine) {
        engine.search(pickRandom(ANALYSIS_QUERIES['analyzer-01']), { limit: 5 })
        engine.store(pickRandom(ANALYSIS_RESULTS['analyzer-01']), 'reasoning', {
          source: 'analyzer-01',
          phase: 'analysis',
        })
      },
    },
    {
      id: 'analyzer-02',
      name: 'Analyzer Two',
      role: 'specialist',
      phase: 'analysis',
      domain: 'tools',
      dependencies: [...discoveryIds],
      operate(engine) {
        engine.search(pickRandom(ANALYSIS_QUERIES['analyzer-02']), { limit: 5 })
        engine.store(pickRandom(ANALYSIS_RESULTS['analyzer-02']), 'tools', {
          source: 'analyzer-02',
          phase: 'analysis',
        })
      },
    },
    {
      id: 'pattern-det',
      name: 'Pattern Detector',
      role: 'specialist',
      phase: 'analysis',
      domain: 'signals',
      dependencies: [...discoveryIds],
      operate(engine) {
        engine.search(pickRandom(ANALYSIS_QUERIES['pattern-det']), { limit: 5 })
        engine.store(pickRandom(ANALYSIS_RESULTS['pattern-det']), 'signals', {
          source: 'pattern-det',
          phase: 'analysis',
        })
      },
    },
    {
      id: 'classifier',
      name: 'Classifier',
      role: 'specialist',
      phase: 'analysis',
      domain: 'memory',
      dependencies: [...discoveryIds],
      operate(engine) {
        engine.search(pickRandom(ANALYSIS_QUERIES['classifier']), { limit: 5 })
        engine.store(pickRandom(ANALYSIS_RESULTS['classifier']), 'memory', {
          source: 'classifier',
          phase: 'analysis',
        })
      },
    },

    // ── Synthesis Phase (4 workers) ─────────────────────────────
    {
      id: 'synth-core',
      name: 'Synth Core',
      role: 'worker',
      phase: 'synthesis',
      domain: 'reasoning',
      dependencies: [...analysisIds],
      operate(engine) {
        engine.search(pickRandom(SYNTHESIS_QUERIES['synth-core']), { limit: 5 })
        engine.store(pickRandom(SYNTHESIS_RESULTS['synth-core']), 'reasoning', {
          source: 'synth-core',
          phase: 'synthesis',
        })
      },
    },
    {
      id: 'builder-01',
      name: 'Builder One',
      role: 'worker',
      phase: 'synthesis',
      domain: 'tools',
      dependencies: [...analysisIds],
      operate(engine) {
        engine.search(pickRandom(SYNTHESIS_QUERIES['builder-01']), { limit: 5 })
        engine.store(pickRandom(SYNTHESIS_RESULTS['builder-01']), 'tools', {
          source: 'builder-01',
          phase: 'synthesis',
        })
      },
    },
    {
      id: 'builder-02',
      name: 'Builder Two',
      role: 'worker',
      phase: 'synthesis',
      domain: 'memory',
      dependencies: [...analysisIds],
      operate(engine) {
        engine.search(pickRandom(SYNTHESIS_QUERIES['builder-02']), { limit: 5 })
        engine.store(pickRandom(SYNTHESIS_RESULTS['builder-02']), 'memory', {
          source: 'builder-02',
          phase: 'synthesis',
        })
      },
    },
    {
      id: 'integrator',
      name: 'Integrator',
      role: 'worker',
      phase: 'synthesis',
      domain: 'signals',
      dependencies: [...analysisIds],
      operate(engine) {
        engine.search(pickRandom(SYNTHESIS_QUERIES['integrator']), { limit: 5 })
        engine.store(pickRandom(SYNTHESIS_RESULTS['integrator']), 'signals', {
          source: 'integrator',
          phase: 'synthesis',
        })
      },
    },

    // ── Optimization Phase (3: guardian + coordinator) ───────────
    {
      id: 'optimizer',
      name: 'Optimizer',
      role: 'guardian',
      phase: 'optimization',
      domain: 'reasoning',
      dependencies: [...synthesisIds],
      operate(engine) {
        // Search across all namespaces
        engine.search(pickRandom(OPTIMIZER_QUERIES), { limit: 10 })
        engine.store(pickRandom(OPTIMIZER_RESULTS), 'reasoning', {
          source: 'optimizer',
          phase: 'optimization',
        })
      },
    },
    {
      id: 'validator',
      name: 'Validator',
      role: 'guardian',
      phase: 'optimization',
      domain: 'signals',
      dependencies: [...synthesisIds],
      operate(engine) {
        engine.search(pickRandom(OPTIMIZER_QUERIES), { limit: 10 })
        engine.store(pickRandom(VALIDATOR_RESULTS), 'signals', {
          source: 'validator',
          phase: 'optimization',
        })
      },
    },
    {
      id: 'queen',
      name: 'Queen',
      role: 'coordinator',
      phase: 'optimization',
      domain: 'memory',
      dependencies: [...synthesisIds],
      operate(engine) {
        engine.store(pickRandom(QUEEN_RESULTS), 'memory', {
          source: 'queen',
          phase: 'optimization',
        })
      },
    },
  ]
}

// ── Swarm Simulator ─────────────────────────────────────────────
export class SwarmSimulator {
  private agents: SwarmAgent[]
  private blueprints: Map<string, AgentBlueprint>
  private engine: SimulableEngine
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private currentPhase: SwarmPhase = 'discovery'
  private running = false
  private subscribers = new Set<() => void>()

  constructor(engine: SimulableEngine) {
    this.engine = engine

    const blueprintList = createBlueprints()
    this.blueprints = new Map(blueprintList.map((b) => [b.id, b]))

    // Initialize agents from blueprints with randomized tick counts
    this.agents = blueprintList.map((bp) => {
      const totalTicks = 3 + Math.floor(Math.random() * 6) // 3-8
      return {
        id: bp.id,
        name: bp.name,
        role: bp.role,
        status: 'pending' as const,
        phase: bp.phase,
        domain: bp.domain,
        utilization: 0,
        ticksRemaining: totalTicks,
        dependencies: bp.dependencies,
      }
    })
  }

  // ── Public API ──────────────────────────────────────────────────

  start(): void {
    if (this.running) return
    this.running = true

    // Activate the first phase
    this.activatePhase(this.currentPhase)

    // 1-second tick interval
    this.tickTimer = setInterval(() => {
      this.tick()
    }, 1_000)
  }

  stop(): void {
    if (!this.running) return
    this.running = false

    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  getAgents(): SwarmAgent[] {
    // Return copies to prevent external mutation
    return this.agents.map((a) => ({ ...a, dependencies: [...a.dependencies] }))
  }

  getCurrentPhase(): SwarmPhase {
    return this.currentPhase
  }

  isRunning(): boolean {
    return this.running
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb)
    return () => {
      this.subscribers.delete(cb)
    }
  }

  destroy(): void {
    this.stop()
    this.subscribers.clear()
  }

  // ── Internal: tick logic ──────────────────────────────────────

  private tick(): void {
    const activeAgents = this.agents.filter(
      (a) => a.phase === this.currentPhase && a.status === 'active',
    )

    // Process each active agent
    for (const agent of activeAgents) {
      // Perform the real engine operation for this agent
      const blueprint = this.blueprints.get(agent.id)
      if (blueprint) {
        try {
          blueprint.operate(this.engine)
        } catch {
          // Engine operations may fail if store is empty during search — that is fine
        }
      }

      // Decrement ticks remaining
      agent.ticksRemaining -= 1

      // Calculate total ticks for utilization
      // We stored the original ticksRemaining at init; derive totalTicks from utilization progression
      const ticksDone = this.getTicksDone(agent)
      const totalTicks = ticksDone + agent.ticksRemaining
      agent.utilization = totalTicks > 0 ? ticksDone / totalTicks : 1

      // Check for completion
      if (agent.ticksRemaining <= 0) {
        agent.ticksRemaining = 0
        agent.status = 'completed'
        agent.utilization = 1

        this.engine.bus.emit('swarm-agent-complete', `${agent.name} completed`, {
          agentId: agent.id,
          agentName: agent.name,
          extra: { phase: agent.phase, domain: agent.domain },
        })
      }
    }

    // Emit tick event
    this.engine.bus.emit('swarm-tick', `Tick: ${activeAgents.length} agents active in ${this.currentPhase}`, {
      extra: {
        phase: this.currentPhase,
        activeCount: activeAgents.length,
        completedCount: this.agents.filter((a) => a.status === 'completed').length,
      },
    })

    // Check if current phase is complete
    const phaseAgents = this.agents.filter((a) => a.phase === this.currentPhase)
    const allComplete = phaseAgents.every((a) => a.status === 'completed')

    if (allComplete) {
      this.engine.bus.emit('swarm-phase-complete', `Phase "${this.currentPhase}" complete`, {
        extra: {
          phase: this.currentPhase,
          agentCount: phaseAgents.length,
        },
      })

      // Advance to next phase or finish
      const currentIndex = PHASE_ORDER.indexOf(this.currentPhase)
      if (currentIndex < PHASE_ORDER.length - 1) {
        this.currentPhase = PHASE_ORDER[currentIndex + 1]
        this.activatePhase(this.currentPhase)
      } else {
        // All 4 phases complete — stop simulation
        this.stop()
      }
    }

    // Notify subscribers so React can re-render
    this.notifySubscribers()
  }

  private activatePhase(phase: SwarmPhase): void {
    this.engine.bus.emit('swarm-phase-start', `Phase "${phase}" starting`, {
      extra: { phase },
    })

    const phaseAgents = this.agents.filter((a) => a.phase === phase)

    for (const agent of phaseAgents) {
      agent.status = 'active'

      this.engine.bus.emit('swarm-agent-activate', `${agent.name} activated`, {
        agentId: agent.id,
        agentName: agent.name,
        extra: { phase: agent.phase, domain: agent.domain, role: agent.role },
      })
    }
  }

  private getTicksDone(agent: SwarmAgent): number {
    // Utilization = ticksDone / totalTicks
    // totalTicks = ticksDone + ticksRemaining
    // So ticksDone = utilization * totalTicks = utilization * (ticksDone + ticksRemaining)
    // ticksDone - utilization * ticksDone = utilization * ticksRemaining
    // ticksDone * (1 - utilization) = utilization * ticksRemaining
    // ticksDone = (utilization * ticksRemaining) / (1 - utilization)
    //
    // Simpler: just count ticks since activation.
    // Since we increment utilization each tick, we can derive:
    // On first tick after activation, utilization was 0, then we set it to 1/total.
    // Just use: total = ticksDone + ticksRemaining, ticksDone = total - ticksRemaining
    // But we don't store totalTicks. Let's compute it from utilization + remaining.
    //
    // If utilization == 0 and ticksRemaining = N, this is the first tick: ticksDone = 1
    // Actually, let's just directly compute: at each tick we add 1 to done.
    // Current utilization was set in a previous tick. So:
    //   If util = 0 → first tick → ticksDone = 1
    //   If util > 0 → ticksDone = round(util * total) + 1
    //   where total was ticksDone_prev + ticksRemaining_prev
    //
    // Simplest approach: derive from the fact that we decrement ticksRemaining by 1
    // each tick and haven't updated utilization yet. The current tick adds 1.
    if (agent.utilization === 0) return 1
    // util_prev = done_prev / (done_prev + remaining_prev)
    // remaining_prev = agent.ticksRemaining + 1 (we already decremented)
    const remainingBefore = agent.ticksRemaining + 1
    const doneBefore = Math.round((agent.utilization * remainingBefore) / (1 - agent.utilization + 1e-9))
    return doneBefore + 1
  }

  private notifySubscribers(): void {
    for (const cb of this.subscribers) {
      cb()
    }
  }
}
