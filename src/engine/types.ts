// ── Memory Entry ──────────────────────────────────────────────
export interface MemoryEntry {
  id: string
  content: string
  namespace: string
  tier: 'hot' | 'warm' | 'cold'
  score: number
  accessCount: number
  createdAt: number
  lastAccessedAt: number
  metadata: Record<string, string>
}

// ── Search ───────────────────────────────────────────────────
export interface SearchResult {
  entry: MemoryEntry
  similarity: number
  decayedScore: number
  patternBoost: number
  finalScore: number
}

export interface SearchOptions {
  namespace?: string
  tier?: 'hot' | 'warm' | 'cold'
  limit?: number
  minScore?: number
}

// ── Vectors ──────────────────────────────────────────────────
/** Sparse vector: Map<termIndex, tfidfWeight> */
export type SparseVector = Map<number, number>

export interface VectorEntry {
  id: string
  vector: SparseVector
}

export interface ProjectedPoint {
  id: string
  position: [number, number, number]
  label: string
  namespace: string
}

// ── HNSW ─────────────────────────────────────────────────────
export interface HNSWNode {
  id: string
  level: number
  connections: Map<number, Set<string>> // layer → connected node ids
}

export interface HNSWConfig {
  M: number             // max connections per layer
  efConstruction: number // beam width during insert
  efSearch: number       // beam width during search
  mL: number            // level generation factor = 1/ln(M)
}

// ── Temporal Decay ───────────────────────────────────────────
export interface DecayConfig {
  hotHalfLife: number    // ms — default 5 minutes
  warmHalfLife: number   // ms — default 1 hour
  coldHalfLife: number   // ms — default 24 hours
  hotThreshold: number   // default 0.7
  warmThreshold: number  // default 0.3
}

// ── Pattern Tracker ──────────────────────────────────────────
export interface PatternRecord {
  query: string
  resultIds: string[]
  timestamp: number
  boost: number
}

export interface CoOccurrence {
  pairKey: string // "idA::idB"
  count: number
  lastSeen: number
}

// ── Events ───────────────────────────────────────────────────
export type EngineEventType =
  | 'store'
  | 'search'
  | 'delete'
  | 'update'
  | 'decay-tick'
  | 'tier-change'
  | 'pattern-match'
  | 'hnsw-insert'
  | 'hnsw-search'
  | 'persist-write'
  | 'persist-load'
  | 'swarm-phase-start'
  | 'swarm-phase-complete'
  | 'swarm-agent-activate'
  | 'swarm-agent-complete'
  | 'swarm-tick'
  | 'seed-complete'
  | 'integration-connected'
  | 'integration-disconnected'
  | 'integration-error'
  | 'integration-probe'

export interface EngineEvent {
  id: string
  type: EngineEventType
  timestamp: number
  agentId?: string
  agentName?: string
  message: string
  data?: Record<string, unknown>
}

// ── Swarm ────────────────────────────────────────────────────
export type SwarmPhase = 'discovery' | 'analysis' | 'synthesis' | 'optimization'

export type SwarmAgentRole = 'scout' | 'worker' | 'coordinator' | 'specialist' | 'guardian'

export type SwarmAgentStatus = 'pending' | 'active' | 'completed' | 'error'

export interface SwarmAgent {
  id: string
  name: string
  role: SwarmAgentRole
  status: SwarmAgentStatus
  phase: SwarmPhase
  domain: string
  utilization: number
  ticksRemaining: number
  dependencies: string[]  // agent ids that must complete first
}

// ── Persistence ──────────────────────────────────────────────
export interface SerializedState {
  entries: MemoryEntry[]
  vectors: Array<{ id: string; vector: Array<[number, number]> }>
  hnswNodes: Array<{
    id: string
    level: number
    connections: Array<[number, string[]]>
  }>
  vocabulary: Array<[string, number]>
  documentFrequencies: Array<[string, number]>
  documentCount: number
  patterns: PatternRecord[]
  coOccurrences: Array<{ pairKey: string; count: number; lastSeen: number }>
  version: number
}

// ── Tier Breakdown (for UI) ──────────────────────────────────
export interface TierBreakdown {
  hot: MemoryEntry[]
  warm: MemoryEntry[]
  cold: MemoryEntry[]
  total: number
}

// ── Engine Stats (for UI) ────────────────────────────────────
export interface EngineStats {
  entryCount: number
  vectorDimensions: number
  hnswLayers: number
  patternCount: number
  tierBreakdown: { hot: number; warm: number; cold: number }
}

// ── Engine Interface ─────────────────────────────────────────
export interface IMemoryEngine {
  // Core operations
  store(content: string, namespace: string, metadata?: Record<string, string>): MemoryEntry
  search(query: string, options?: SearchOptions): SearchResult[]
  get(id: string): MemoryEntry | undefined
  delete(id: string): boolean
  update(id: string, content: string): MemoryEntry | undefined

  // Queries
  getTierBreakdown(): TierBreakdown
  getStats(): EngineStats
  getVectorPoints(): ProjectedPoint[]
  getRecentEvents(limit?: number): EngineEvent[]

  // Lifecycle
  subscribe(callback: () => void): () => void
  destroy(): void
}
