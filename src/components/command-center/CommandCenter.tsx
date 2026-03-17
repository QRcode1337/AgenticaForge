import { useState, useEffect, useCallback, useRef } from 'react'
import { useMemory } from '../../hooks/use-memory.ts'
import { useSwarm } from '../../hooks/use-swarm.ts'
import { supabase } from '../../lib/supabase.ts'
import type { ActionType, ActionSource, TerminalLine, RunLogEntry } from './types.ts'
import { ActionBus, msg } from './action-bus.ts'
import { parseCommand } from './parse-command.ts'
import { GRAMMAR_MAP, ACTION_REGISTRY } from './schemas.ts'
import { AGENTICA_CATALOG, AGENTICA_CATEGORIES } from '../../data/agentica-catalog.ts'
import Terminal from './Terminal.tsx'
import QuickActions from './QuickActions.tsx'
import LiveStatus from './LiveStatus.tsx'
import ActionForm from './ActionForm.tsx'
import ConfirmDialog from './ConfirmDialog.tsx'
import RunDetailDrawer from './RunDetailDrawer.tsx'

// ── Feature flag ──────────────────────────────────────────────────
const USE_BACKEND = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co',
)

// ── Helpers ─────────────────────────────────────────────────

let lineId = 0
function ln(kind: TerminalLine['kind'], text: string, run_id?: string, data?: Record<string, unknown>): TerminalLine {
  return { id: `ln-${++lineId}-${Date.now()}`, kind, text, run_id, data }
}

// ── Main Component ──────────────────────────────────────────

export default function CommandCenter() {
  const { engine, stats, tierBreakdown, store, search } = useMemory()
  const swarm = useSwarm()

  const [lines, setLines] = useState<TerminalLine[]>([])
  const [formAction, setFormAction] = useState<ActionType | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{ run_id: string; action: ActionType; description: string } | null>(null)
  const [drawerRunId, setDrawerRunId] = useState<string | null>(null)

  // Stable refs for handler closures
  const engineRef = useRef(engine)
  const statsRef = useRef(stats)
  const tierRef = useRef(tierBreakdown)
  const storeRef = useRef(store)
  const searchRef = useRef(search)
  const swarmRef = useRef(swarm)

  engineRef.current = engine
  statsRef.current = stats
  tierRef.current = tierBreakdown
  storeRef.current = store
  searchRef.current = search
  swarmRef.current = swarm

  // Create ActionBus once
  const busRef = useRef<ActionBus | null>(null)
  if (busRef.current === null) {
    const bus = new ActionBus()

    // ── Register all 16 handlers ──────────────────────────

    bus.register('MEMORY_STORE', (env) => {
      const ns = (env.payload.ns as string) || 'default'
      const content = (env.payload.content as string) || ''
      if (!content) {
        return { run_id: env.run_id, status: 'error', messages: [msg('ERROR', 'Content is required')], metrics: { latency_ms: 0 } }
      }

      // Backend path: also insert into Supabase memories table
      if (USE_BACKEND) {
        void (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            await supabase.from('memories').insert({
              user_id: session.user.id,
              content,
              namespace: ns,
              metadata: {},
              tier: 'hot',
              type: 'fact',
              origin: 'human',
              visibility: 'private',
              score: 1.0,
              embedding_status: 'pending',
            })
          } catch (err) {
            console.error('[CommandCenter] Backend store failed:', err)
          }
        })()
      }

      const entry = storeRef.current(content, ns)
      return {
        run_id: env.run_id,
        status: 'ok',
        messages: [
          msg('MEMORY', `Stored in "${ns}" \u2014 id: ${entry.id}`),
          msg('INFO', `content: "${content.slice(0, 60)}${content.length > 60 ? '\u2026' : ''}"`, { tier: entry.tier, score: entry.score }),
        ],
        metrics: { latency_ms: 0 },
      }
    })

    bus.register('MEMORY_SEARCH', (env) => {
      const query = (env.payload.query as string) || ''
      if (!query) {
        return { run_id: env.run_id, status: 'error', messages: [msg('ERROR', 'Query is required')], metrics: { latency_ms: 0 } }
      }
      const limit = Number(env.payload.limit) || 5
      const ns = env.payload.ns as string | undefined

      // Backend path: also query Supabase (fire-and-forget log to console)
      if (USE_BACKEND) {
        void (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            let q = supabase
              .from('memories')
              .select('id, content, namespace, tier, score')
              .eq('user_id', session.user.id)
              .ilike('content', `%${query}%`)
              .order('created_at', { ascending: false })
              .limit(limit)
            if (ns) q = q.eq('namespace', ns)
            const { data } = await q
            if (data && data.length > 0) {
              console.log(`[CommandCenter] Backend search for "${query}": ${data.length} results`, data)
            }
          } catch (err) {
            console.error('[CommandCenter] Backend search failed:', err)
          }
        })()
      }

      const results = searchRef.current(query, { limit, namespace: ns })
      const messages = [
        msg('INFO', `Search: "${query}" \u2014 ${results.length} results`),
        ...results.map((r) =>
          msg('MEMORY', `[${r.finalScore.toFixed(3)}] ${r.entry.content.slice(0, 70)}`, {
            namespace: r.entry.namespace,
            tier: r.entry.tier,
            similarity: r.similarity,
            decay: r.decayedScore,
            boost: r.patternBoost,
          }),
        ),
      ]
      if (results.length === 0) messages.push(msg('INFO', 'No results found'))
      return { run_id: env.run_id, status: 'ok', messages, metrics: { latency_ms: 0 } }
    })

    bus.register('MEMORY_STATS', (env) => ({
      run_id: env.run_id,
      status: 'ok',
      messages: [
        msg('INFO', 'ENGINE STATISTICS'),
        msg('INFO', `entries: ${statsRef.current.entryCount}`),
        msg('INFO', `vectors: ${statsRef.current.vectorDimensions}`),
        msg('INFO', `hnsw_layers: ${statsRef.current.hnswLayers}`),
        msg('INFO', `patterns: ${statsRef.current.patternCount}`),
        msg('INFO', `hot: ${statsRef.current.tierBreakdown.hot} | warm: ${statsRef.current.tierBreakdown.warm} | cold: ${statsRef.current.tierBreakdown.cold}`),
      ],
      metrics: { latency_ms: 0 },
    }))

    bus.register('MEMORY_TIERS', (env) => {
      const tb = tierRef.current
      const messages = [
        msg('INFO', 'TIER BREAKDOWN'),
        msg('MEMORY', `HOT  (score \u2265 0.7): ${tb.hot.length} entries`),
        msg('INFO', `WARM (score \u2265 0.3): ${tb.warm.length} entries`),
        msg('INFO', `COLD (score < 0.3):  ${tb.cold.length} entries`),
        msg('INFO', `TOTAL: ${tb.total} entries`),
      ]
      for (const e of tb.hot.slice(0, 3)) {
        messages.push(msg('INFO', `  [${e.id}] ${e.content.slice(0, 50)}\u2026`))
      }
      return { run_id: env.run_id, status: 'ok', messages, metrics: { latency_ms: 0 } }
    })

    bus.register('MEMORY_NAMESPACES', (env) => {
      const entries = engineRef.current.getEntries()
      const nsMap = new Map<string, number>()
      for (const e of entries) nsMap.set(e.namespace, (nsMap.get(e.namespace) ?? 0) + 1)

      const messages = [msg('INFO', 'ACTIVE NAMESPACES')]
      if (nsMap.size === 0) {
        messages.push(msg('INFO', '(none)'))
      } else {
        for (const [ns, count] of nsMap.entries()) {
          messages.push(msg('INFO', `${ns}: ${count} entries`))
        }
      }
      return { run_id: env.run_id, status: 'ok', messages, metrics: { latency_ms: 0 } }
    })

    bus.register('MEMORY_DELETE', (env) => {
      const id = env.payload.id as string
      if (!id) {
        return { run_id: env.run_id, status: 'error', messages: [msg('ERROR', 'Entry ID is required')], metrics: { latency_ms: 0 } }
      }
      const ok = engineRef.current.delete(id)
      return {
        run_id: env.run_id,
        status: ok ? 'ok' : 'error',
        messages: [ok ? msg('MEMORY', `Deleted entry: ${id}`) : msg('ERROR', `Entry not found: ${id}`)],
        metrics: { latency_ms: 0 },
      }
    })

    bus.register('MEMORY_PURGE_COLD', (env) => {
      const cold = tierRef.current.cold
      if (cold.length === 0) {
        return { run_id: env.run_id, status: 'ok', messages: [msg('INFO', 'No cold-tier entries to purge')], metrics: { latency_ms: 0 } }
      }
      let deleted = 0
      for (const e of cold) { if (engineRef.current.delete(e.id)) deleted++ }
      return { run_id: env.run_id, status: 'ok', messages: [msg('MEMORY', `Purged ${deleted} cold-tier entries`)], metrics: { latency_ms: 0 } }
    })

    bus.register('SWARM_START', (env) => {
      if (swarmRef.current.running) {
        return { run_id: env.run_id, status: 'error', messages: [msg('ERROR', 'Swarm simulation already running')], metrics: { latency_ms: 0 } }
      }

      // Backend path: also create swarm run in Supabase
      if (USE_BACKEND) {
        void (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            await supabase.from('swarm_runs').insert({
              user_id: session.user.id,
              status: 'running',
              phase: 'discovery',
            })
          } catch (err) {
            console.error('[CommandCenter] Backend swarm start failed:', err)
          }
        })()
      }

      swarmRef.current.start()
      return {
        run_id: env.run_id,
        status: 'ok',
        messages: [
          msg('DECISION', 'Swarm simulation started'),
          msg('INFO', '15 agents \u00b7 4 phases: discovery \u2192 analysis \u2192 synthesis \u2192 optimization'),
          msg('INFO', 'Events streaming to Live Feed panel'),
        ],
        metrics: { latency_ms: 0 },
      }
    })

    bus.register('SWARM_STOP', (env) => {
      if (!swarmRef.current.running) {
        return { run_id: env.run_id, status: 'error', messages: [msg('ERROR', 'No simulation running')], metrics: { latency_ms: 0 } }
      }
      swarmRef.current.stop()
      return { run_id: env.run_id, status: 'ok', messages: [msg('DECISION', 'Swarm simulation stopped')], metrics: { latency_ms: 0 } }
    })

    bus.register('SWARM_STATUS', (env) => {
      const s = swarmRef.current
      const byStatus = { pending: 0, active: 0, completed: 0, error: 0 }
      for (const a of s.agents) byStatus[a.status]++
      return {
        run_id: env.run_id,
        status: 'ok',
        messages: [
          msg('INFO', 'SWARM STATUS'),
          msg('DECISION', `running: ${s.running}`),
          msg('INFO', `phase: ${s.phase}`),
          msg('INFO', `agents: ${byStatus.active} active | ${byStatus.completed} completed | ${byStatus.pending} pending`),
        ],
        metrics: { latency_ms: 0 },
      }
    })

    bus.register('SWARM_AGENTS', (env) => {
      const agents = swarmRef.current.agents
      const messages = [
        msg('INFO', `SWARM AGENTS (${agents.length})`),
        msg('INFO', 'STATUS     NAME               ROLE         PHASE          DOMAIN'),
      ]
      for (const a of agents) {
        messages.push(msg(
          a.status === 'active' ? 'DECISION' : a.status === 'error' ? 'ERROR' : 'INFO',
          `${a.status.padEnd(10)} ${a.name.padEnd(18)} ${a.role.padEnd(12)} ${a.phase.padEnd(14)} ${a.domain}`,
        ))
      }
      return { run_id: env.run_id, status: 'ok', messages, metrics: { latency_ms: 0 } }
    })

    bus.register('DB_STATS', (env) => ({
      run_id: env.run_id,
      status: 'ok',
      messages: [
        msg('INFO', 'AGENTDB STATISTICS'),
        msg('INFO', `hnsw_layers: ${statsRef.current.hnswLayers}`),
        msg('INFO', `vector_entries: ${statsRef.current.vectorDimensions}`),
        msg('INFO', `pattern_count: ${statsRef.current.patternCount}`),
        msg('INFO', `total_entries: ${statsRef.current.entryCount}`),
      ],
      metrics: { latency_ms: 0 },
    }))

    bus.register('DB_PATTERNS', (env) => {
      const patternState = engineRef.current.getPatternState()
      const messages = [
        msg('INFO', 'PATTERN TRACKER'),
        msg('INFO', `patterns: ${patternState.patterns.length}`),
        msg('INFO', `co-occurrences: ${patternState.coOccurrences.length}`),
      ]
      for (const p of patternState.patterns.slice(-5)) {
        messages.push(msg('INFO', `"${p.query}" \u2192 ${p.resultIds.length} results (boost: ${p.boost.toFixed(3)})`))
      }
      return { run_id: env.run_id, status: 'ok', messages, metrics: { latency_ms: 0 } }
    })

    bus.register('DB_EXPORT', (env) => {
      const state = {
        entries: engineRef.current.getEntries(),
        vectors: engineRef.current.getVectorStoreState(),
        hnsw: engineRef.current.getHNSWState(),
        patterns: engineRef.current.getPatternState(),
      }
      console.log('[AgentForge] Engine state export:', state)
      return {
        run_id: env.run_id,
        status: 'ok',
        messages: [
          msg('TOOL', 'State exported to browser console (F12)'),
          msg('INFO', `${state.entries.length} entries, ${statsRef.current.hnswLayers} HNSW layers, ${statsRef.current.patternCount} patterns`),
        ],
        metrics: { latency_ms: 0 },
      }
    })

    bus.register('AGENTICA_CATALOG', (env) => {
      const category = env.payload.category as string | undefined
      const agents = category
        ? AGENTICA_CATALOG.filter((a) => a.category === category)
        : AGENTICA_CATALOG

      const messages = [
        msg('INFO', `AGENTICA CATALOG${category ? ` [${category.toUpperCase()}]` : ''} \u2014 ${agents.length} agents`),
        msg('INFO', 'NAME                    CATEGORY       ROLE           DESCRIPTION'),
      ]
      for (const a of agents) {
        messages.push(msg('INFO', `${a.name.padEnd(23)} ${a.category.padEnd(14)} ${a.suggestedRole.padEnd(14)} ${a.description.slice(0, 50)}`))
      }
      if (agents.length === 0) messages.push(msg('INFO', '(no agents match filter)'))
      messages.push(msg('INFO', ''))
      messages.push(msg('INFO', `Categories: ${AGENTICA_CATEGORIES.join(', ')}`))
      return { run_id: env.run_id, status: 'ok', messages, metrics: { latency_ms: 0 } }
    })

    bus.register('AGENTICA_STATUS', (env) => ({
      run_id: env.run_id,
      status: 'ok',
      messages: [
        msg('INFO', 'AGENTICA STATUS'),
        msg('INFO', `catalog: ${AGENTICA_CATALOG.length} agent templates loaded`),
        msg('INFO', `categories: ${AGENTICA_CATEGORIES.length} (${AGENTICA_CATEGORIES.join(', ')})`),
        msg('INFO', `routing: ${USE_BACKEND ? 'backend worker (agentic-flow ModelRouter)' : 'local mode (no worker)'}`),
        msg('INFO', `providers: Anthropic, OpenAI, OpenRouter, Gemini, ONNX, Ollama`),
      ],
      metrics: { latency_ms: 0 },
    }))

    bus.register('AGENTICA_PROVIDERS', (env) => ({
      run_id: env.run_id,
      status: 'ok',
      messages: [
        msg('INFO', 'SUPPORTED LLM PROVIDERS'),
        msg('INFO', '  Anthropic     Claude Sonnet, Opus, Haiku       ANTHROPIC_API_KEY'),
        msg('INFO', '  OpenAI        GPT-4o, GPT-4-turbo              OPENAI_API_KEY'),
        msg('INFO', '  OpenRouter    Multi-model aggregator            OPENROUTER_API_KEY'),
        msg('INFO', '  Gemini        Google Gemini Pro/Flash           GOOGLE_GEMINI_API_KEY'),
        msg('INFO', '  ONNX          Local ONNX Runtime models         (local)'),
        msg('INFO', '  Ollama        Local LLM serving                 (local)'),
        msg('INFO', ''),
        msg('INFO', 'Configure API keys as environment variables. The ModelRouter'),
        msg('INFO', 'auto-detects available providers and enables fallback chains.'),
      ],
      metrics: { latency_ms: 0 },
    }))

    bus.register('UTILITY_HELP', (env) => ({
      run_id: env.run_id,
      status: 'ok',
      messages: [
        msg('INFO', ''),
        msg('INFO', 'MEMORY OPERATIONS'),
        msg('INFO', '  mem:store --ns <ns> --content "text"    Store a memory entry'),
        msg('INFO', '  mem:search "query"                      Semantic search (TF-IDF + HNSW)'),
        msg('INFO', '  mem:stats                               Engine statistics'),
        msg('INFO', '  mem:tiers                               Tier breakdown (hot/warm/cold)'),
        msg('INFO', '  mem:namespaces                          List active namespaces'),
        msg('INFO', '  mem:delete --id <id>                    Delete entry by ID'),
        msg('INFO', '  mem:purge-cold                          Remove all cold-tier entries'),
        msg('INFO', ''),
        msg('INFO', 'SWARM ORCHESTRATION'),
        msg('INFO', '  swarm:start                             Launch 15-agent 4-phase simulation'),
        msg('INFO', '  swarm:stop                              Halt simulation'),
        msg('INFO', '  swarm:status                            Phase & agent counts'),
        msg('INFO', '  swarm:agents                            List all swarm agents'),
        msg('INFO', ''),
        msg('INFO', 'AGENTDB ENGINE'),
        msg('INFO', '  db:stats                                HNSW layers, vectors, patterns'),
        msg('INFO', '  db:patterns                             Pattern tracker statistics'),
        msg('INFO', '  db:export                               Export state to console'),
        msg('INFO', ''),
        msg('INFO', 'AGENTICA'),
        msg('INFO', '  agentica:catalog                        Browse agent templates'),
        msg('INFO', '  agentica:catalog --category <cat>       Filter by category'),
        msg('INFO', '  agentica:status                         Router and catalog status'),
        msg('INFO', '  agentica:providers                      List supported LLM providers'),
        msg('INFO', ''),
        msg('INFO', 'UTILITY'),
        msg('INFO', '  clear                                   Clear terminal'),
        msg('INFO', '  help                                    Show this help'),
      ],
      metrics: { latency_ms: 0 },
    }))

    bus.register('UTILITY_CLEAR', (env) => ({
      run_id: env.run_id,
      status: 'ok',
      messages: [],
      metrics: { latency_ms: 0 },
    }))

    busRef.current = bus
  }

  const bus = busRef.current!

  // Welcome banner with backend stats
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const banner = [
      ln('info', ''),
      ln('heading', '  AGENTFORGE COMMAND CENTER v2'),
      ln('dim', '  Memory \u00b7 Swarm \u00b7 AgentDB Operations'),
      ln('info', ''),
    ]

    if (USE_BACKEND) {
      // Fetch backend stats async
      void (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) {
            banner.push(ln('error', '  Not authenticated - backend unavailable'))
          } else {
            const [memRes, agentRes, eventRes] = await Promise.all([
              supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
              supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
              supabase.from('events').select('id', { count: 'exact', head: true }),
            ])
            const memCount = memRes.count ?? 0
            const agentCount = agentRes.count ?? 0
            const eventCount = eventRes.count ?? 0
            banner.push(ln('success', `  Backend connected: ${memCount} memories | ${agentCount} agents | ${eventCount} events`))
          }
        } catch {
          banner.push(ln('info', `  Engine ready: ${stats.entryCount} entries | ${stats.hnswLayers} HNSW layers`))
        }
        banner.push(ln('dim', "  Type 'help' for available commands. Tab for autocomplete."))
        banner.push(ln('info', ''))
        setLines(banner)
      })()
    } else {
      banner.push(ln('info', `  Engine ready: ${stats.entryCount} entries | ${stats.hnswLayers} HNSW layers | ${stats.patternCount} patterns`))
      banner.push(ln('dim', "  Type 'help' for available commands. Tab for autocomplete."))
      banner.push(ln('info', ''))
      setLines(banner)
    }
  }, [stats])

  // ── Centralized dispatch ────────────────────────────────

  const resultToLines = useCallback((result: ReturnType<typeof bus.dispatch>): TerminalLine[] => {
    const newLines: TerminalLine[] = []

    for (const m of result.messages) {
      const kind: TerminalLine['kind'] =
        m.type === 'ERROR' ? 'error'
          : m.type === 'MEMORY' ? 'success'
          : m.type === 'DECISION' ? 'heading'
          : m.type === 'REWARD' ? 'success'
          : m.type === 'TOOL' ? 'success'
          : 'info'

      newLines.push(ln(kind, m.text, result.run_id, m.data))
    }

    // Add run_id footer
    if (result.status !== 'partial' && result.messages.length > 0) {
      newLines.push(ln('dim', `[${result.run_id}] ${result.metrics.latency_ms}ms`))
    }

    return newLines
  }, [])

  const handleDispatch = useCallback((action: ActionType, payload: Record<string, unknown>, source: ActionSource) => {
    // Special: UTILITY_CLEAR
    if (action === 'UTILITY_CLEAR') {
      setLines([])
      bus.dispatch(action, payload, source)
      return
    }

    const result = bus.dispatch(action, payload, source)

    if (result.status === 'partial') {
      // Needs confirmation
      const schema = ACTION_REGISTRY.get(action)
      setPendingConfirm({
        run_id: result.run_id,
        action,
        description: schema?.description ?? `Execute ${action}`,
      })
      return
    }

    const newLines = resultToLines(result)
    setLines((prev) => [...prev, ...newLines])
  }, [resultToLines])

  // ── Terminal submit (parse raw command) ─────────────────

  const handleTerminalSubmit = useCallback((raw: string) => {
    // Echo the input
    setLines((prev) => [...prev, ln('input', `> ${raw}`)])

    const parsed = parseCommand(raw)

    // Resolve action type
    let actionType: ActionType | undefined

    if (parsed.verb && !parsed.domain) {
      // Utility commands
      actionType = GRAMMAR_MAP.get(parsed.verb)
    } else if (parsed.domain && parsed.verb) {
      actionType = GRAMMAR_MAP.get(`${parsed.domain}:${parsed.verb}`)
    }

    if (!actionType) {
      setLines((prev) => [
        ...prev,
        ln('error', `Unknown command: ${raw}`),
        ln('dim', "Type 'help' for available commands"),
      ])
      return
    }

    // Build payload from parsed flags + content
    const payload: Record<string, unknown> = { ...parsed.flags }

    // For commands with content as the primary argument, map it
    if (parsed.content) {
      if (actionType === 'MEMORY_SEARCH') {
        payload.query = parsed.content
      } else if (actionType === 'MEMORY_STORE' && !payload.content) {
        // Legacy: mem:store <ns> <content> — first word is ns if no --ns flag
        if (!payload.ns) {
          const parts = parsed.content.split(/\s+/)
          payload.ns = parts[0]
          payload.content = parts.slice(1).join(' ')
        } else {
          payload.content = parsed.content
        }
      } else if (actionType === 'MEMORY_DELETE' && !payload.id) {
        payload.id = parsed.content
      } else if (actionType === 'AGENTICA_CATALOG' && !payload.category) {
        payload.category = parsed.content
      }
    }

    handleDispatch(actionType, payload, 'terminal')
  }, [handleDispatch])

  // ── Quick action handlers ───────────────────────────────

  const handleFormAction = useCallback((action: ActionType) => {
    setFormAction(action)
  }, [])

  const handleDirectAction = useCallback((action: ActionType) => {
    handleDispatch(action, {}, 'quick_action')
  }, [handleDispatch])

  const handleFormSubmit = useCallback((action: ActionType, payload: Record<string, unknown>) => {
    setFormAction(null)
    handleDispatch(action, payload, 'quick_action')
  }, [handleDispatch])

  // ── Confirmation handlers ───────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!pendingConfirm) return
    const result = bus.dispatchConfirmed(pendingConfirm.run_id)
    const newLines = resultToLines(result)
    setLines((prev) => [...prev, ...newLines])
    setPendingConfirm(null)
  }, [pendingConfirm, resultToLines])

  const handleCancelConfirm = useCallback(() => {
    if (pendingConfirm) {
      bus.cancelPending(pendingConfirm.run_id)
      setLines((prev) => [...prev, ln('dim', `Cancelled: ${pendingConfirm.action}`)])
    }
    setPendingConfirm(null)
  }, [pendingConfirm])

  // ── Run detail drawer ──────────────────────────────────

  const drawerEntry: RunLogEntry | null = drawerRunId ? (bus.getRunById(drawerRunId) ?? null) : null

  const handleRunIdClick = useCallback((run_id: string) => {
    setDrawerRunId(run_id)
  }, [])

  const handleClearTerminal = useCallback(() => {
    setLines([])
  }, [])

  // ── Render ────────────────────────────────────────────

  return (
    <div className="flex h-full w-full bg-forge-bg font-mono">
      {/* Left: Terminal */}
      <Terminal
        lines={lines}
        onSubmit={handleTerminalSubmit}
        onClear={handleClearTerminal}
        onRunIdClick={handleRunIdClick}
      />

      {/* Right: Actions + Status */}
      <div className="flex w-[300px] flex-shrink-0 flex-col overflow-y-auto">
        <QuickActions
          onFormAction={handleFormAction}
          onDirectAction={handleDirectAction}
        />

        {/* Status dashboard */}
        <div className="flex-shrink-0 px-4 pb-4">
          <LiveStatus
            stats={stats}
            tierBreakdown={tierBreakdown}
            swarm={swarm}
            lastAction={bus.getLastAction()}
          />
        </div>
      </div>

      {/* Overlays */}
      {formAction && (
        <ActionForm
          action={formAction}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormAction(null)}
        />
      )}

      {pendingConfirm && (
        <ConfirmDialog
          action={pendingConfirm.action}
          description={pendingConfirm.description}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

      <RunDetailDrawer
        entry={drawerEntry}
        onClose={() => setDrawerRunId(null)}
      />
    </div>
  )
}
