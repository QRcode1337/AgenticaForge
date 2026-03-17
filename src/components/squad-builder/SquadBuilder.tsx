import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type OnConnect,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence } from 'framer-motion'
import { useSwarm } from '../../hooks/use-swarm.ts'
import { supabase } from '../../lib/supabase.ts'
import AgentEditor from './AgentEditor.tsx'
import AgentCatalog from './AgentCatalog.tsx'

// ── Feature flag ──────────────────────────────────────────────────
const USE_BACKEND = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentRole = 'scout' | 'worker' | 'coordinator' | 'specialist' | 'guardian'
type AgentStatus = 'active' | 'idle' | 'training' | 'error' | 'completed'

interface AgentNodeData {
  label: string
  role: AgentRole
  status: AgentStatus
  memorySlots: number
  maxMemorySlots: number
  [key: string]: unknown
}

type AgentFlowNode = Node<AgentNodeData, 'agent'>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<AgentRole, string> = {
  scout: '#3B82F6',
  worker: '#22C55E',
  coordinator: '#F59E0B',
  specialist: '#A855F7',
  guardian: '#EF4444',
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: '#22C55E',
  idle: '#F59E0B',
  training: '#3B82F6',
  error: '#EF4444',
  completed: '#A855F7',
}

const ROLE_ICONS: Record<AgentRole, string> = {
  scout: '\u2318',      // command / compass
  worker: '\u2692',      // hammer and pick
  coordinator: '\u272A', // star
  specialist: '\u2726',  // diamond
  guardian: '\u2691',     // flag
}

function mapSwarmStatus(status: string): AgentStatus {
  switch (status) {
    case 'active': return 'active'
    case 'completed': return 'completed'
    case 'error': return 'error'
    default: return 'idle'
  }
}

const EDGE_STYLE = { stroke: '#484c58', strokeDasharray: '4 4' }

const TOPOLOGY_OPTIONS = ['mesh', 'hierarchical', 'ring', 'star'] as const

// ---------------------------------------------------------------------------
// AgentNode Component (custom React Flow node)
// ---------------------------------------------------------------------------

function AgentNode({ data }: NodeProps<AgentFlowNode>) {
  const roleColor = ROLE_COLORS[data.role]
  const statusColor = STATUS_COLORS[data.status]
  const memoryPercent =
    data.maxMemorySlots > 0
      ? Math.round((data.memorySlots / data.maxMemorySlots) * 100)
      : 0

  return (
    <div
      className="relative w-48 rounded-none border border-forge-border bg-forge-surface p-3"
      style={{ borderLeftWidth: '2px', borderLeftColor: roleColor }}
    >
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !rounded-none !border-2 !border-forge-border !bg-forge-elevated"
      />

      {/* Status indicator dot */}
      <span
        className="absolute top-2.5 right-2.5 block h-2 w-2 rounded-full"
        style={{ backgroundColor: statusColor }}
      />

      {/* Icon area */}
      <div
        className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-none text-lg font-mono font-bold"
        style={{ backgroundColor: `${roleColor}12`, color: roleColor }}
      >
        {ROLE_ICONS[data.role]}
      </div>

      {/* Name */}
      <p className="truncate text-center font-mono text-sm uppercase tracking-wider text-forge-text">
        {data.label}
      </p>

      {/* Role badge */}
      <p
        className="mt-0.5 text-center font-mono text-[10px] font-medium uppercase tracking-wider"
        style={{ color: roleColor }}
      >
        {data.role}
      </p>

      {/* Memory usage bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-forge-dim">
          <span>MEM</span>
          <span>
            {data.memorySlots}/{data.maxMemorySlots}
          </span>
        </div>
        <div className="mt-0.5 h-[2px] w-full overflow-hidden rounded-none bg-forge-elevated">
          <div
            className="h-full rounded-none transition-all duration-300"
            style={{
              width: `${memoryPercent}%`,
              backgroundColor:
                memoryPercent > 80
                  ? '#EF4444'
                  : memoryPercent > 50
                    ? '#F59E0B'
                    : '#22C55E',
            }}
          />
        </div>
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !rounded-none !border-2 !border-forge-border !bg-forge-elevated"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Node types (must be defined OUTSIDE the component to avoid re-registration)
// ---------------------------------------------------------------------------

const nodeTypes = { agent: AgentNode }

// ---------------------------------------------------------------------------
// Default graph data
// ---------------------------------------------------------------------------

const defaultNodes: AgentFlowNode[] = [
  {
    id: 'coord-1',
    type: 'agent',
    position: { x: 300, y: 50 },
    data: {
      label: 'Nexus',
      role: 'coordinator',
      status: 'active',
      memorySlots: 6,
      maxMemorySlots: 8,
    },
  },
  {
    id: 'spec-1',
    type: 'agent',
    position: { x: 100, y: 200 },
    data: {
      label: 'Cipher',
      role: 'specialist',
      status: 'active',
      memorySlots: 4,
      maxMemorySlots: 6,
    },
  },
  {
    id: 'spec-2',
    type: 'agent',
    position: { x: 500, y: 200 },
    data: {
      label: 'Prism',
      role: 'specialist',
      status: 'training',
      memorySlots: 3,
      maxMemorySlots: 6,
    },
  },
  {
    id: 'worker-1',
    type: 'agent',
    position: { x: 200, y: 380 },
    data: {
      label: 'Bolt',
      role: 'worker',
      status: 'idle',
      memorySlots: 2,
      maxMemorySlots: 4,
    },
  },
  {
    id: 'worker-2',
    type: 'agent',
    position: { x: 400, y: 380 },
    data: {
      label: 'Spark',
      role: 'worker',
      status: 'active',
      memorySlots: 3,
      maxMemorySlots: 4,
    },
  },
]

const defaultEdges: Edge[] = [
  {
    id: 'e-coord-spec1',
    source: 'coord-1',
    target: 'spec-1',
    animated: true,
    style: EDGE_STYLE,
  },
  {
    id: 'e-coord-spec2',
    source: 'coord-1',
    target: 'spec-2',
    animated: true,
    style: EDGE_STYLE,
  },
  {
    id: 'e-spec1-worker1',
    source: 'spec-1',
    target: 'worker-1',
    animated: true,
    style: EDGE_STYLE,
  },
  {
    id: 'e-spec2-worker2',
    source: 'spec-2',
    target: 'worker-2',
    animated: true,
    style: EDGE_STYLE,
  },
]

// ---------------------------------------------------------------------------
// Random name generator for new agents
// ---------------------------------------------------------------------------

const AGENT_NAMES = [
  'Drift', 'Flare', 'Echo', 'Pulse', 'Shade', 'Vex', 'Nova', 'Rune',
  'Flux', 'Wren', 'Arc', 'Zen', 'Byte', 'Glyph', 'Hex', 'Ion',
]

let nodeCounter = defaultNodes.length

function createAgentId(): string {
  nodeCounter += 1
  return `agent-${nodeCounter}-${Date.now()}`
}

// ---------------------------------------------------------------------------
// V3 Swarm Template
// ---------------------------------------------------------------------------

const V3_SWARM_AGENTS: Array<{
  id: string
  label: string
  role: AgentRole
  phase: 'discovery' | 'analysis' | 'synthesis' | 'optimization'
}> = [
  // Discovery phase (4 agents)
  { id: 'scout-alpha', label: 'Scout-Alpha', role: 'scout', phase: 'discovery' },
  { id: 'scout-beta', label: 'Scout-Beta', role: 'scout', phase: 'discovery' },
  { id: 'scout-gamma', label: 'Scout-Gamma', role: 'scout', phase: 'discovery' },
  { id: 'recon-01', label: 'Recon-01', role: 'scout', phase: 'discovery' },
  // Analysis phase (4 agents)
  { id: 'analyzer-01', label: 'Analyzer-01', role: 'specialist', phase: 'analysis' },
  { id: 'analyzer-02', label: 'Analyzer-02', role: 'specialist', phase: 'analysis' },
  { id: 'pattern-det', label: 'Pattern-Det', role: 'specialist', phase: 'analysis' },
  { id: 'classifier', label: 'Classifier', role: 'specialist', phase: 'analysis' },
  // Synthesis phase (4 agents)
  { id: 'synth-core', label: 'Synth-Core', role: 'worker', phase: 'synthesis' },
  { id: 'builder-01', label: 'Builder-01', role: 'worker', phase: 'synthesis' },
  { id: 'builder-02', label: 'Builder-02', role: 'worker', phase: 'synthesis' },
  { id: 'integrator', label: 'Integrator', role: 'worker', phase: 'synthesis' },
  // Optimization phase (3 agents)
  { id: 'optimizer', label: 'Optimizer', role: 'guardian', phase: 'optimization' },
  { id: 'validator', label: 'Validator', role: 'guardian', phase: 'optimization' },
  { id: 'queen', label: 'Queen', role: 'coordinator', phase: 'optimization' },
]

const PHASE_Y: Record<string, number> = {
  optimization: 40,
  analysis: 200,
  synthesis: 380,
  discovery: 560,
}

// ---------------------------------------------------------------------------
// SquadBuilder Component
// ---------------------------------------------------------------------------

export default function SquadBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [topology, setTopology] = useState<(typeof TOPOLOGY_OPTIONS)[number]>('hierarchical')
  const [squadName, setSquadName] = useState('Alpha Squad')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ title: string; type: string } | null>(null)

  useEffect(() => {
    if (!USE_BACKEND) return
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const evtSource = new EventSource(`${apiUrl}/api/telemetry`)
    
    evtSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data)
      if (parsed.type === 'deliverable-created') {
        const payload = parsed.payload
        setToastMsg({ title: payload.title, type: payload.type })
        setTimeout(() => setToastMsg(null), 5000)
      }
    }

    return () => evtSource.close()
  }, [])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: EDGE_STYLE,
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  // Swarm simulation state
  const { agents: swarmAgents, phase: swarmPhase, running: swarmRunning, start: swarmStart, stop: swarmStop } = useSwarm()

  // Stable key derived from agent data — prevents infinite re-render from new array refs
  const swarmKey = swarmAgents.map((a) => `${a.id}:${a.status}:${a.utilization.toFixed(2)}`).join('|')

  // ── Backend: load agents from Supabase ──
  useEffect(() => {
    if (!USE_BACKEND) return
    let cancelled = false

    async function loadBackendAgents() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || cancelled) return

        const { data, error } = await supabase
          .from('agents')
          .select('id, name, role, status, system_prompt')
          .eq('user_id', session.user.id)

        if (error || !data || cancelled) return

        // Only override if we got agents and the graph is still at defaults
        if (data.length > 0) {
          const backendNodes: AgentFlowNode[] = data.map((agent, idx) => ({
            id: agent.id,
            type: 'agent' as const,
            position: { x: 150 + (idx % 4) * 220, y: 100 + Math.floor(idx / 4) * 200 },
            data: {
              label: agent.name,
              role: (agent.role ?? 'worker') as AgentRole,
              status: mapSwarmStatus(agent.status ?? 'idle'),
              memorySlots: 0,
              maxMemorySlots: 4,
            },
          }))

          setNodes(backendNodes)
          setEdges([])
          setSquadName('Backend Agents')
        }
      } catch (err) {
        console.error('[SquadBuilder] Failed to load backend agents:', err)
      }
    }

    void loadBackendAgents()
    return () => { cancelled = true }
  }, [setNodes, setEdges])

  // ── Backend: subscribe to real-time agent_tasks status ──
  useEffect(() => {
    if (!USE_BACKEND || !swarmRunning) return

    const channel = supabase
      .channel('squad-agent-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_tasks' },
        (payload) => {
          const row = payload.new as { agent_id?: string; status?: string; utilization?: number } | undefined
          if (!row?.agent_id) return

          setNodes((currentNodes) => {
            const idx = currentNodes.findIndex((n) => n.id === row.agent_id)
            if (idx < 0) return currentNodes
            const node = currentNodes[idx]
            const newStatus = mapSwarmStatus(row.status ?? 'idle')
            const maxMem = node.data.maxMemorySlots
            const newSlots = Math.round((row.utilization ?? 0) * maxMem)
            if (node.data.status === newStatus && node.data.memorySlots === newSlots) return currentNodes
            const next = [...currentNodes]
            next[idx] = {
              ...node,
              data: { ...node.data, status: newStatus, memorySlots: newSlots },
            }
            return next
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [swarmRunning, setNodes])

  // Sync swarm agent state → React Flow node data
  useEffect(() => {
    if (swarmAgents.length === 0) return
    const agentMap = new Map(swarmAgents.map((a) => [a.id, a]))
    setNodes((currentNodes) => {
      let changed = false
      const next = currentNodes.map((node) => {
        const agent = agentMap.get(node.id)
        if (!agent) return node
        const newStatus = mapSwarmStatus(agent.status)
        const maxMem = node.data.maxMemorySlots
        const newSlots = Math.round(agent.utilization * maxMem)
        if (node.data.status === newStatus && node.data.memorySlots === newSlots) return node
        changed = true
        return {
          ...node,
          data: { ...node.data, status: newStatus, memorySlots: newSlots },
        }
      })
      return changed ? next : currentNodes
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swarmKey, setNodes])

  const handleAddAgent = useCallback(() => {
    const name = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)]
    const newNode: AgentFlowNode = {
      id: createAgentId(),
      type: 'agent',
      position: {
        x: 250 + (Math.random() - 0.5) * 200,
        y: 200 + (Math.random() - 0.5) * 150,
      },
      data: {
        label: name,
        role: 'worker',
        status: 'idle',
        memorySlots: 0,
        maxMemorySlots: 4,
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  const handleLoadSwarm = useCallback(() => {
    // Build nodes arranged in 4 rows by phase
    const phaseAgents: Record<string, typeof V3_SWARM_AGENTS> = {}
    for (const agent of V3_SWARM_AGENTS) {
      if (!phaseAgents[agent.phase]) phaseAgents[agent.phase] = []
      phaseAgents[agent.phase].push(agent)
    }

    const swarmNodes: AgentFlowNode[] = V3_SWARM_AGENTS.map((agent) => {
      const row = phaseAgents[agent.phase]
      const idx = row.indexOf(agent)
      const rowWidth = row.length * 220
      const startX = (800 - rowWidth) / 2
      return {
        id: agent.id,
        type: 'agent' as const,
        position: { x: startX + idx * 220, y: PHASE_Y[agent.phase] },
        data: {
          label: agent.label,
          role: agent.role,
          status: 'idle' as const,
          memorySlots: 0,
          maxMemorySlots: agent.role === 'coordinator' ? 12 : agent.role === 'guardian' ? 8 : 4,
        },
      }
    })

    // Build dependency edges between adjacent phases
    const phaseOrder = ['discovery', 'analysis', 'synthesis', 'optimization'] as const
    const swarmEdges: Edge[] = []
    for (let p = 0; p < phaseOrder.length - 1; p++) {
      const sources = V3_SWARM_AGENTS.filter((a) => a.phase === phaseOrder[p])
      const targets = V3_SWARM_AGENTS.filter((a) => a.phase === phaseOrder[p + 1])
      // Connect each source to each target in the next phase
      for (const src of sources) {
        for (const tgt of targets) {
          swarmEdges.push({
            id: `e-${src.id}-${tgt.id}`,
            source: src.id,
            target: tgt.id,
            animated: true,
            style: EDGE_STYLE,
          })
        }
      }
    }

    setNodes(swarmNodes)
    setEdges(swarmEdges)
    setSquadName('V3 Swarm')
    setTopology('hierarchical')
  }, [setNodes, setEdges])

  const handleRunSimulation = useCallback(async () => {
    // Ensure V3 swarm template is loaded
    const isV3Loaded = nodes.some((n) => V3_SWARM_AGENTS.some((a) => a.id === n.id))
    if (!isV3Loaded) {
      handleLoadSwarm()
    }
    
    // Check if we should deploy to real Agentica backend
    const USE_BACKEND = true
    if (USE_BACKEND) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        await fetch(`${apiUrl}/api/swarm/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges })
        })
        console.log('[SquadBuilder] Triggered Agentica Backend Swarm')
      } catch (err) {
        console.error('[SquadBuilder] Backend swarm trigger failed:', err)
      }
    }
    
    swarmStart() // still start local simulation for visuals
  }, [nodes, edges, handleLoadSwarm, swarmStart])

  const handleStopSimulation = useCallback(async () => {
    const USE_BACKEND = true
    if (USE_BACKEND) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        await fetch(`${apiUrl}/api/swarm/stop`, { method: 'POST' })
        console.log('[SquadBuilder] Stopped Agentica Backend Swarm')
      } catch (err) {
        console.error('[SquadBuilder] Backend swarm stop failed:', err)
      }
    }
    swarmStop()
  }, [swarmStop])

  const handleEditorSave = useCallback(() => {
    setShowEditor(false)
    setSelectedAgentId(null)
  }, [])

  const handleNewAgent = useCallback(() => {
    setSelectedAgentId(null)
    setShowEditor(true)
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-forge-bg font-mono">
      {/* ---- Header bar ---- */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-forge-border bg-forge-surface px-4 py-2.5">
        {/* Title */}
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-forge-text">
          SQUAD BUILDER
        </h2>

        {/* Divider */}
        <div className="h-5 w-px bg-forge-border" />

        {/* Squad name */}
        <input
          type="text"
          value={squadName}
          onChange={(e) => setSquadName(e.target.value)}
          className="w-40 rounded-sm border border-forge-border bg-forge-bg px-2 py-1 font-mono text-sm text-forge-text outline-none transition-colors focus:border-forge-accent"
          aria-label="Squad name"
        />

        {/* Topology selector */}
        <select
          value={topology}
          onChange={(e) =>
            setTopology(e.target.value as (typeof TOPOLOGY_OPTIONS)[number])
          }
          className="rounded-sm border border-forge-border bg-forge-bg px-2 py-1 font-mono text-sm uppercase tracking-wider text-forge-muted outline-none transition-colors focus:border-forge-accent"
          aria-label="Topology"
        >
          {TOPOLOGY_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Node count */}
        <span className="font-mono text-xs uppercase tracking-wider text-forge-dim">
          {nodes.length} AGENTS &middot; {edges.length} LINKS
        </span>

        {/* Phase indicator */}
        {swarmRunning && (
          <span
            className="rounded-sm px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' }}
          >
            PHASE: {swarmPhase}
          </span>
        )}

        {/* Simulation control */}
        {swarmRunning ? (
          <button
            onClick={handleStopSimulation}
            className="rounded-sm border border-red-500 bg-transparent px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-red-500 transition-opacity hover:opacity-90"
          >
            STOP
          </button>
        ) : (
          <button
            onClick={handleRunSimulation}
            className="rounded-sm border border-green-500 bg-transparent px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-green-500 transition-opacity hover:opacity-90"
          >
            RUN SIM
          </button>
        )}

        {/* Load template */}
        <button
          onClick={handleLoadSwarm}
          className="rounded-sm border border-forge-accent bg-transparent px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-forge-accent transition-opacity hover:opacity-90"
        >
          LOAD V3 SWARM
        </button>
        <button
          onClick={handleAddAgent}
          className="rounded-sm bg-forge-cta px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-forge-bg transition-opacity hover:opacity-90 active:opacity-75"
        >
          + ADD AGENT
        </button>
        <button
          onClick={handleNewAgent}
          className="rounded-sm border border-forge-cta bg-transparent px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-forge-cta transition-opacity hover:opacity-90"
        >
          NEW AGENT
        </button>
        <button
          onClick={() => setShowCatalog(true)}
          className="rounded-sm border px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-90"
          style={{ borderColor: '#F97316', color: '#F97316' }}
        >
          CATALOG
        </button>
      </header>

      {/* ---- Canvas ---- */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_event, node) => {
            setSelectedAgentId(node.id)
            setShowEditor(true)
          }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            animated: true,
            style: EDGE_STYLE,
          }}
        >
          <Background color="#252830" gap={24} size={1} />
          <Controls
            showInteractive={false}
            className="!rounded-sm !border !border-forge-border !bg-forge-surface"
          />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as AgentNodeData | undefined
              if (data?.role) return ROLE_COLORS[data.role] ?? '#484c58'
              return '#484c58'
            }}
            maskColor="rgba(8, 10, 15, 0.75)"
            className="!rounded-sm !border !border-forge-border !bg-forge-surface"
          />
        </ReactFlow>
      </div>

      {/* Agent Editor Side Panel */}
      <AnimatePresence>
        {showEditor && (
          <AgentEditor
            agentId={selectedAgentId}
            onClose={() => {
              setShowEditor(false)
              setSelectedAgentId(null)
            }}
            onSave={handleEditorSave}
          />
        )}
      </AnimatePresence>

      {/* Agent Catalog Side Panel */}
      <AnimatePresence>
        {showCatalog && (
          <AgentCatalog
            onClose={() => setShowCatalog(false)}
            onImport={() => {
              setShowCatalog(false)
              // Trigger reload from backend
              if (USE_BACKEND) {
                void (async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session?.user) return
                  const { data } = await supabase
                    .from('agents')
                    .select('id, name, role, status')
                    .eq('user_id', session.user.id)
                  if (data && data.length > 0) {
                    setNodes(data.map((agent, idx) => ({
                      id: agent.id,
                      type: 'agent' as const,
                      position: { x: 150 + (idx % 4) * 220, y: 100 + Math.floor(idx / 4) * 200 },
                      data: {
                        label: agent.name,
                        role: (agent.role ?? 'worker') as AgentRole,
                        status: mapSwarmStatus(agent.status ?? 'idle'),
                        memorySlots: 0,
                        maxMemorySlots: 4,
                      },
                    })))
                  }
                })()
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast Notification for Deliverables */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 right-6 z-50 rounded-sm border border-forge-cta bg-forge-surface px-4 py-3 shadow-lg flex items-center gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-forge-cta/20 text-forge-cta">
              ✓
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-forge-cta">
                Deliverable Generated
              </p>
              <p className="font-mono text-[10px] text-forge-text">
                {toastMsg.title} ({toastMsg.type})
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
