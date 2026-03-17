import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FeedEvent } from '../../types'
import { useMemory } from '../../hooks/use-memory.ts'
import { supabase } from '../../lib/supabase.ts'
import type { EngineEventType } from '../../engine/types.ts'

// ── Feature flag ────────────────────────────────────────────────────
const USE_BACKEND = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co',
)

// ---------------------------------------------------------------------------
// Gruvbox-inspired text palette (warm tones — backgrounds stay forge-*)
// ---------------------------------------------------------------------------

const TXT = {
  fg:      '#ebdbb2', // primary text (warm cream)
  fg2:     '#d5c4a1', // secondary text
  fg3:     '#bdae93', // tertiary
  fg4:     '#a89984', // muted
  gray:    '#928374', // dim
  dim:     '#665c54', // very dim
  red:     '#fb4934',
  green:   '#b8bb26',
  yellow:  '#fabd2f',
  blue:    '#83a598',
  purple:  '#d3869b',
  aqua:    '#8ec07c',
  orange:  '#fe8019',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedFilter = 'all' | 'decision' | 'memory' | 'tool' | 'error' | 'reward'

interface ActiveAgent {
  id: string
  name: string
  icon: string
  version: string
  status: 'running' | 'idle' | 'error'
  lastMessage: string
  lastSeen: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: { label: string; value: FeedFilter }[] = [
  { label: 'ALL_EVENTS', value: 'all' },
  { label: 'DECISIONS', value: 'decision' },
  { label: 'MEMORY', value: 'memory' },
  { label: 'TOOLS', value: 'tool' },
  { label: 'ERRORS', value: 'error' },
  { label: 'REWARDS', value: 'reward' },
]

// Map FeedEvent type → label, color, icon, background tint
const TYPE_STYLES: Record<FeedEvent['type'], { label: string; color: string; bg: string; icon: string }> = {
  tool:     { label: 'TOOL',     color: TXT.green,  bg: 'rgba(184, 187, 38, 0.10)', icon: '\u25A4' },
  decision: { label: 'DECISION', color: TXT.yellow, bg: 'rgba(250, 189, 47, 0.10)', icon: '\u2726' },
  memory:   { label: 'MEMORY',   color: TXT.aqua,   bg: 'rgba(142, 192, 124, 0.10)', icon: '\u25C9' },
  error:    { label: 'ERROR',    color: TXT.red,    bg: 'rgba(251, 73, 52, 0.12)',  icon: '\u26A0' },
  reward:   { label: 'REWARD',   color: TXT.purple, bg: 'rgba(211, 134, 155, 0.10)', icon: '\u2699' },
}

// Each agent gets a unique color used in both the feed and the agent panel
const AGENT_COLORS: Record<string, string> = {
  'nexus-07':       TXT.green,
  'void-analyzer':  TXT.purple,
  'code-weaver':    TXT.aqua,
  'guardian-x':     TXT.orange,
  'logic-gate':     TXT.blue,
  'echo-prime':     TXT.yellow,
}

const AGENT_POOL = [
  { id: 'nexus-07', name: 'NEXUS-07', icon: '\u03A3', version: 'v2.1 Stable' },
  { id: 'void-analyzer', name: 'VOID-ANALYZER', icon: '\u03C6', version: 'v1.4 Beta' },
  { id: 'code-weaver', name: 'CODE-WEAVER', icon: '\u039B', version: 'v3.0 Stable' },
  { id: 'guardian-x', name: 'GUARDIAN-X', icon: '\u0394', version: 'v2.8 Stable' },
  { id: 'logic-gate', name: 'LOGIC-GATE', icon: '\u25B3', version: 'v3.0.1 Patch' },
  { id: 'echo-prime', name: 'ECHO-PRIME', icon: '\u03A9', version: 'v1.7 Stable' },
]

const MESSAGE_TEMPLATES: Record<FeedEvent['type'], string[]> = {
  decision: [
    'selected tool: web-search with confidence 0.94',
    'chose reasoning path: chain-of-thought',
    'delegated subtask to ECHO-PRIME with confidence 0.88',
    'selected strategy: divide-and-conquer for multi-step query',
    'activated fallback path after primary timeout',
    'chose memory retrieval over fresh inference (cost: 120 tokens)',
    'switched model: gpt-4o -> claude-3.5 for code generation',
    'selected tool: code-interpreter with confidence 0.91',
  ],
  memory: [
    'stored session context to hot tier (2,400 tokens)',
    'evicted cold storage pattern: legacy-v2',
    'promoted warm tier entry to hot (similarity: 0.96)',
    'compressed context window from 8K to 3.2K tokens',
    'indexed new pattern: error-recovery-v3 in vector store',
    'merged duplicate memory slots (saved 1,800 tokens)',
    'archived conversation thread #47 to cold storage',
    'loaded cached embedding for domain: authentication',
  ],
  tool: [
    'executed: git-diff on src/auth.ts',
    "called: semantic-search('agent patterns')",
    'invoked: code-lint on 12 files (passed)',
    'ran: unit-test suite (47/47 passed)',
    "called: web-fetch('https://docs.example.com/api')",
    'executed: file-write to /tmp/output.json',
    'invoked: image-analysis on screenshot.png',
    "ran: shell-command('npm run build')",
  ],
  error: [
    'FATAL_ERROR: Timed out after 30s. Connection reset by peer.',
    'Vector dimension mismatch (768 vs 1024)',
    'Rate limit exceeded: 429 Too Many Requests',
    'Memory allocation failed: context window full',
    'Tool execution failed: permission denied on /etc/config',
    'API Connection timeout: Connection to LLM endpoint refused...',
    'JSON parse error in API response',
    'Token budget exceeded: 4,096 / 4,000 limit',
  ],
  reward: [
    'received reward +0.82 for task completion',
    'reward signal: +0.45 code quality improvement',
    'penalty -0.12 for exceeding latency budget',
    'reward +0.91 for successful tool chain execution',
    'bonus +0.33 for memory efficiency optimization',
    'reward +0.67 for accurate classification',
    'penalty -0.08 for redundant API call',
    'reward +0.78 for collaborative task resolution',
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let eventCounter = 0

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateEvent(timestamp?: Date): FeedEvent {
  eventCounter += 1
  const type = randomItem<FeedEvent['type']>(['decision', 'memory', 'tool', 'error', 'reward'])
  const agent = randomItem(AGENT_POOL)
  const message = randomItem(MESSAGE_TEMPLATES[type])

  return {
    id: `evt-${eventCounter}-${Date.now()}`,
    timestamp: formatTime(timestamp ?? new Date()),
    agentId: agent.id,
    agentName: agent.name,
    type,
    message,
    confidence:
      type === 'decision' || type === 'reward'
        ? parseFloat((0.5 + Math.random() * 0.5).toFixed(2))
        : undefined,
  }
}

function generateInitialEvents(count: number): FeedEvent[] {
  const events: FeedEvent[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const ts = new Date(now - (count - i) * 4000)
    events.push(generateEvent(ts))
  }
  return events.reverse()
}

// ---------------------------------------------------------------------------
// Engine event type → Feed event type mapping
// ---------------------------------------------------------------------------

function mapEventType(engineType: EngineEventType): FeedEvent['type'] {
  switch (engineType) {
    case 'store':
    case 'search':
    case 'update':
    case 'delete':
    case 'decay-tick':
    case 'tier-change':
    case 'seed-complete':
      return 'memory'
    case 'hnsw-insert':
    case 'hnsw-search':
    case 'persist-write':
    case 'persist-load':
    case 'integration-connected':
    case 'integration-disconnected':
    case 'integration-probe':
      return 'tool'
    case 'integration-error':
      return 'error'
    case 'pattern-match':
      return 'reward'
    case 'swarm-phase-start':
    case 'swarm-phase-complete':
    case 'swarm-agent-activate':
    case 'swarm-agent-complete':
    case 'swarm-tick':
      return 'decision'
    default:
      return 'tool'
  }
}

// ---------------------------------------------------------------------------
// Throughput sparkline (SVG)
// ---------------------------------------------------------------------------

const CHART_POINTS = 40
const CHART_W = 600
const CHART_H = 60

function ThroughputChart({ data }: { data: number[] }) {
  if (data.length < 2) return null

  const max = Math.max(...data, 1)
  const points = data
    .map((v, i) => {
      const x = (i / (CHART_POINTS - 1)) * CHART_W
      const y = CHART_H - (v / max) * (CHART_H - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-full w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={TXT.aqua}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Glow effect */}
      <polyline
        points={points}
        fill="none"
        stroke={TXT.aqua}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.15"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// FeedLogEntry (multi-line layout with per-type colors)
// ---------------------------------------------------------------------------

function FeedLogEntry({ event }: { event: FeedEvent }) {
  const typeStyle = TYPE_STYLES[event.type]
  const agentColor = AGENT_COLORS[event.agentId] ?? TXT.fg4
  const isError = event.type === 'error'
  const hasConfidence = event.confidence !== undefined

  return (
    <div
      className="px-4 py-2.5 font-mono"
      style={{
        borderBottom: '1px solid rgba(60, 56, 54, 0.3)',
        backgroundColor: isError ? 'rgba(251, 73, 52, 0.08)' : undefined,
      }}
    >
      {/* Line 1: timestamp + agent (agent color) + type pill (type color) */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="flex-shrink-0" style={{ color: TXT.dim }}>
          {event.timestamp}
        </span>
        <span className="font-bold" style={{ color: agentColor }}>
          {event.agentName}
        </span>
        <span style={{ color: TXT.dim }}>{'\u2022'}</span>
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5"
          style={{
            color: typeStyle.color,
            backgroundColor: typeStyle.bg,
          }}
        >
          <span className="text-[9px]">{typeStyle.icon}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest">{typeStyle.label}</span>
        </span>
      </div>

      {/* Line 2: message */}
      <div
        className="mt-1 text-[12px] leading-relaxed"
        style={{ color: isError ? TXT.red : TXT.fg2, paddingLeft: '2px' }}
      >
        {event.message}
      </div>

      {/* Line 3: confidence bar (decision/reward only) */}
      {hasConfidence && (
        <div className="mt-1.5 flex items-center gap-2" style={{ paddingLeft: '2px' }}>
          <div className="h-1.5 w-28 overflow-hidden bg-forge-elevated">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(event.confidence ?? 0) * 100}%`,
                backgroundColor: typeStyle.color,
              }}
            />
          </div>
          <span className="text-[10px] font-bold" style={{ color: typeStyle.color }}>
            {event.confidence?.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AgentCard (right panel)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ActiveAgent['status'], { dot: string; label: string; text: string }> = {
  running: { dot: TXT.green, label: 'RUNNING', text: TXT.green },
  idle:    { dot: TXT.yellow, label: 'IDLE', text: TXT.yellow },
  error:   { dot: TXT.red, label: 'ERROR', text: TXT.red },
}

function AgentCard({ agent }: { agent: ActiveAgent }) {
  const statusStyle = STATUS_COLORS[agent.status]
  const agentColor = AGENT_COLORS[agent.id] ?? TXT.fg4

  return (
    <div
      className="mx-3 mb-3 border bg-forge-surface p-4"
      style={{ borderColor: 'rgba(60, 56, 54, 0.5)' }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center font-mono text-lg"
          style={{ color: agentColor, backgroundColor: 'rgba(60, 56, 54, 0.3)' }}
        >
          {agent.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold tracking-wider" style={{ color: agentColor }}>
              {agent.name}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: statusStyle.text }}>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: statusStyle.dot }}
              />
              {statusStyle.label}
            </span>
          </div>
          <span className="font-mono text-[11px]" style={{ color: TXT.gray }}>
            {agent.version}
          </span>
        </div>
      </div>

      {/* Last message */}
      <p
        className="mt-2.5 font-mono text-xs leading-relaxed"
        style={{ color: agent.status === 'error' ? TXT.red : TXT.fg3 }}
      >
        &quot;{agent.lastMessage}&quot;
      </p>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        {agent.status === 'running' && (
          <>
            <button
              className="flex-1 border py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              PAUSE
            </button>
            <button
              className="border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              TERMINATE
            </button>
          </>
        )}
        {agent.status === 'idle' && (
          <>
            <button
              className="flex-1 border py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              RESUME
            </button>
            <button
              className="border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              TERMINATE
            </button>
          </>
        )}
        {agent.status === 'error' && (
          <>
            <button
              className="flex-1 border py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors"
              style={{ borderColor: TXT.orange, color: TXT.orange }}
            >
              RESTART
            </button>
            <button
              className="border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              DEBUG
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LiveFeed (main)
// ---------------------------------------------------------------------------

export default function LiveFeed() {
  const { recentEvents, stats } = useMemory()
  const [localEvents, setLocalEvents] = useState<FeedEvent[]>(() => USE_BACKEND ? [] : generateInitialEvents(15))
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all')
  const [mockEnabled, setMockEnabled] = useState(!USE_BACKEND)
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  const [throughputData, setThroughputData] = useState<number[]>(() => {
    // Seed with some random data so chart isn't empty
    return Array.from({ length: CHART_POINTS }, () => Math.floor(Math.random() * 4) + 1)
  })
  const throughputBucketRef = useRef(0)

  // Map engine events to FeedEvent format
  const mappedEvents: FeedEvent[] = useMemo(
    () =>
      recentEvents.map((evt) => ({
        id: evt.id,
        timestamp: new Date(evt.timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        agentId: evt.agentId ?? 'system',
        agentName: evt.agentName ?? 'ENGINE',
        type: mapEventType(evt.type),
        message: evt.message,
      })),
    [recentEvents],
  )

  // Derive active agents from recent events
  const activeAgents: ActiveAgent[] = useMemo(() => {
    const now = Date.now()
    const agentMap = new Map<string, ActiveAgent>()

    // Initialize from pool
    for (const a of AGENT_POOL) {
      agentMap.set(a.id, {
        id: a.id,
        name: a.name,
        icon: a.icon,
        version: a.version,
        status: 'idle',
        lastMessage: 'Waiting for next task assignment...',
        lastSeen: 0,
      })
    }

    // Update from local events (newest first, so first match wins)
    for (const evt of localEvents) {
      const existing = agentMap.get(evt.agentId)
      if (existing && existing.lastSeen === 0) {
        existing.lastMessage = evt.message
        existing.lastSeen = now
        if (evt.type === 'error') {
          existing.status = 'error'
        } else {
          existing.status = 'running'
        }
      }
    }

    // Mark agents with no recent activity as idle
    const agents = [...agentMap.values()]
    // Keep 2 idle, rest running/error for visual variety
    let idleCount = 0
    for (const a of agents) {
      if (a.lastSeen === 0) {
        idleCount++
        if (idleCount > 2) a.status = 'running'
      }
    }

    return agents
  }, [localEvents])

  // Track scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    userScrolledRef.current = containerRef.current.scrollTop > 40
  }, [])

  // Auto-generate new mock events + update throughput
  useEffect(() => {
    let eventInterval: ReturnType<typeof setInterval> | null = null

    if (mockEnabled) {
      eventInterval = setInterval(() => {
        const newEvent = generateEvent()
        setLocalEvents((prev) => [newEvent, ...prev])
        throughputBucketRef.current += 1

        if (!userScrolledRef.current && containerRef.current) {
          containerRef.current.scrollTop = 0
        }
      }, 2000)
    }

    const chartInterval = setInterval(() => {
      setThroughputData((prev) => {
        const next = [...prev.slice(1), throughputBucketRef.current]
        throughputBucketRef.current = 0
        return next
      })
    }, 3000)

    return () => {
      if (eventInterval) clearInterval(eventInterval)
      clearInterval(chartInterval)
    }
  }, [mockEnabled])

  // ── Supabase: load historical events on mount ──
  useEffect(() => {
    if (!USE_BACKEND) return
    let cancelled = false

    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, created_at, agent_id, agent_name, type, message, data')
          .order('created_at', { ascending: false })
          .limit(50)

        if (cancelled || error || !data) return

        const historyEvents: FeedEvent[] = data.map((row) => {
          const feedType = (row.type === 'decision' || row.type === 'memory' || row.type === 'tool' || row.type === 'error' || row.type === 'reward')
            ? row.type as FeedEvent['type']
            : 'tool'

          return {
            id: row.id ?? `evt-hist-${Date.now()}-${Math.random()}`,
            timestamp: new Date(row.created_at).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            agentId: row.agent_id ?? row.agent_name ?? 'system',
            agentName: row.agent_name ?? 'BACKEND',
            type: feedType,
            message: row.message ?? '',
          }
        })

        setLocalEvents((prev) => [...historyEvents, ...prev])
      } catch (err) {
        console.error('[LiveFeed] Failed to load history:', err)
      }
    }

    void loadHistory()
    return () => { cancelled = true }
  }, [])

  // ── Supabase real-time events subscription ──
  useEffect(() => {
    if (!USE_BACKEND) return

    const channel = supabase
      .channel('events-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          const row = payload.new as {
            id: string
            created_at: string
            agent_id?: string
            agent_name?: string
            type?: string
            message?: string
            confidence?: number
          }

          const feedType = (row.type === 'decision' || row.type === 'memory' || row.type === 'tool' || row.type === 'error' || row.type === 'reward')
            ? row.type as FeedEvent['type']
            : 'tool'

          const newEvent: FeedEvent = {
            id: row.id ?? `evt-rt-${Date.now()}`,
            timestamp: new Date(row.created_at).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            agentId: row.agent_id ?? 'system',
            agentName: row.agent_name ?? 'BACKEND',
            type: feedType,
            message: row.message ?? '',
            confidence: row.confidence,
          }

          // Prepend to top of feed
          setLocalEvents((prev) => [newEvent, ...prev])

          throughputBucketRef.current += 1

          if (!userScrolledRef.current && containerRef.current) {
            containerRef.current.scrollTop = 0
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Tag events with source for opacity control
  const taggedMapped = useMemo(
    () => mappedEvents.map((e) => ({ ...e, _mock: false })),
    [mappedEvents],
  )
  const taggedLocal = useMemo(
    () => localEvents.map((e) => ({ ...e, _mock: true })),
    [localEvents],
  )

  // Merge events
  const allEvents = useMemo(
    () => [...taggedMapped, ...taggedLocal],
    [taggedMapped, taggedLocal],
  )

  const filtered =
    activeFilter === 'all'
      ? allEvents
      : allEvents.filter((e) => e.type === activeFilter)

  // Stats
  const totalEvents = allEvents.length
  const errorCount = allEvents.filter((e) => e.type === 'error').length
  const eventRate = throughputData.length > 0 ? throughputData[throughputData.length - 1] : 0

  const handleClear = useCallback(() => {
    setLocalEvents([])
    userScrolledRef.current = false
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-forge-bg font-mono">
      {/* ════════ Top system bar ════════ */}
      <header
        className="flex flex-shrink-0 items-center gap-4 px-4 py-2"
        style={{ borderBottom: `1px solid rgba(60, 56, 54, 0.4)` }}
      >
        <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: TXT.red }}>
          AGENTFORGE OS v1.0.0
        </span>
        <span className="font-mono text-xs" style={{ color: TXT.gray }}>
          [ NODE: LOCAL-DEV ]
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs" style={{ color: TXT.green }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TXT.green }} />
          SYSTEM ONLINE
        </span>

        <div className="flex-1" />

        <span className="font-mono text-xs" style={{ color: TXT.gray }}>
          TOKENS: <span style={{ color: TXT.fg }}>{stats.entryCount > 0 ? '1.2M' : '0'}</span>
        </span>
        <span className="font-mono text-xs" style={{ color: TXT.gray }}>
          TASKS: <span style={{ color: TXT.yellow }}>{totalEvents}</span>
        </span>
        <span className="font-mono text-xs" style={{ color: TXT.gray }}>
          RATE: <span style={{ color: TXT.green }}>{eventRate}/3s</span>
        </span>
      </header>

      {/* ════════ Main content: log + agents ════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ──── Left column: Log Stream ──── */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          style={{ borderRight: '1px solid rgba(60, 56, 54, 0.4)' }}
        >
          {/* Log header */}
          <div
            className="flex flex-shrink-0 items-center gap-3 px-4 py-2"
            style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.4)' }}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: TXT.fg }}>
              SYSTEM_LOG_STREAM
            </span>

            <div className="flex-1" />

            {/* Filter chips */}
            <div className="flex items-center gap-1">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActiveFilter(opt.value)}
                  className="rounded-none px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
                  style={{
                    color: activeFilter === opt.value ? TXT.fg : TXT.dim,
                    borderBottom: activeFilter === opt.value ? `1px solid ${TXT.aqua}` : '1px solid transparent',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <span className="font-mono text-[10px]" style={{ color: TXT.dim }}>
              RATE: {eventRate > 0 ? `${Math.round(eventRate * 333)}ms` : '---'}
            </span>

            <button
              onClick={() => setMockEnabled((v) => !v)}
              className="rounded-none px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
              style={{
                color: mockEnabled ? TXT.yellow : TXT.dim,
                borderBottom: `1px solid ${mockEnabled ? TXT.yellow : 'transparent'}`,
              }}
            >
              MOCK {mockEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleClear}
              className="font-mono text-[10px] uppercase tracking-wider transition-colors hover:underline"
              style={{ color: TXT.gray }}
            >
              CLEAR
            </button>
          </div>

          {/* Log entries */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
          >
            <AnimatePresence initial={false}>
              {filtered.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: event._mock && mockEnabled ? 0.4 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <FeedLogEntry event={event} />
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="flex h-32 items-center justify-center">
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: TXT.dim }}>
                  NO EVENTS TO DISPLAY
                </span>
              </div>
            )}
          </div>

        </div>

        {/* ──── Right column: Active Agents ──── */}
        <div className="flex w-[300px] flex-shrink-0 flex-col overflow-hidden">
          {/* Agents header */}
          <div
            className="flex flex-shrink-0 items-center px-4 py-2"
            style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.4)' }}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: TXT.fg }}>
              ACTIVE_AGENTS
            </span>
            <div className="flex-1" />
            <button
              className="border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              VIEW_ALL
            </button>
          </div>

          {/* Agent cards */}
          <div className="flex-1 overflow-y-auto pt-3">
            {activeAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}

            {/* Deploy button */}
            <div
              className="mx-3 mb-3 flex items-center justify-center border border-dashed py-3"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)' }}
            >
              <span className="font-mono text-xs uppercase tracking-wider" style={{ color: TXT.dim }}>
                + [ DEPLOY_NEW_AGENT ]
              </span>
            </div>
          </div>

          {/* Network Load mini panel */}
          <div
            className="flex-shrink-0 px-4 py-2.5"
            style={{ borderTop: '1px solid rgba(60, 56, 54, 0.4)' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: TXT.fg4 }}>
                NETWORK LOAD
              </span>
              <span className="font-mono text-[10px]" style={{ color: TXT.fg }}>
                {Math.min(99, 30 + eventRate * 8)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden bg-forge-elevated">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.min(99, 30 + eventRate * 8)}%`,
                  backgroundColor: TXT.blue,
                }}
              />
            </div>
            <div className="mt-2 flex gap-4">
              <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: TXT.dim }}>
                SETTINGS
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: TXT.dim }}>
                DOCS
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: TXT.dim }}>
                LOGOUT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ Bottom: Throughput Chart + Stats ════════ */}
      <footer
        className="flex flex-shrink-0 items-end gap-4 px-4 py-2"
        style={{ borderTop: '1px solid rgba(60, 56, 54, 0.4)' }}
      >
        {/* Chart area */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: TXT.fg4 }}>
              THROUGHPUT_OVERVIEW_GLOBAL
            </span>
            <span className="font-mono text-[10px] uppercase" style={{ color: TXT.aqua }}>
              SYNC_STABLE
            </span>
          </div>
          <div className="h-[48px] w-full">
            <ThroughputChart data={throughputData} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1 pb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
            EVENTS: <span style={{ color: TXT.fg }}>{totalEvents}</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
            ERRORS: <span style={{ color: TXT.red }}>{errorCount}</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
            MEMORY: <span style={{ color: TXT.fg }}>{stats.entryCount} entries</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
