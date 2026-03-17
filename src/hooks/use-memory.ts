import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { MemoryEngine } from '../engine/memory-engine.ts'
import { PersistenceManager } from '../engine/persistence.ts'
import { supabase } from '../lib/supabase.ts'
import type {
  EngineEvent,
  EngineStats,
  MemoryEntry,
  ProjectedPoint,
  SearchOptions,
  SearchResult,
  TierBreakdown,
} from '../engine/types.ts'

// ── Feature flag: use Agentica Backend when configured ──────────
const USE_BACKEND = true

// ── Context ──────────────────────────────────────────────────────
const MemoryContext = createContext<MemoryEngine | null>(null)

// ── Seed helper (local engine only) ─────────────────────────────
async function trySeed(engine: MemoryEngine): Promise<void> {
  try {
    const mod = await import('../engine/seed-data.ts')
    mod.seed(engine)
  } catch {
    // seed-data module not available yet
  }
}

// ── Provider ────────────────────────────────────────────────────
interface MemoryProviderProps {
  children: ReactNode
}

export function MemoryProvider({ children }: MemoryProviderProps) {
  const engineRef = useRef<MemoryEngine | null>(null)
  const persistenceRef = useRef<PersistenceManager | null>(null)
  const initRef = useRef(false)

  if (engineRef.current === null) {
    engineRef.current = new MemoryEngine()
    persistenceRef.current = new PersistenceManager(engineRef.current)
  }

  const engine = engineRef.current
  const persistence = persistenceRef.current!

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    let destroyed = false
    let unsubscribe: (() => void) | null = null

    async function bootstrap() {
      await persistence.init()
      if (destroyed) return

      if (engine.getStats().entryCount === 0) {
        await trySeed(engine)
      }

      unsubscribe = engine.subscribe(() => {
        persistence.scheduleSave()
      })
    }

    void bootstrap()

    return () => {
      destroyed = true
      if (unsubscribe) unsubscribe()
      engine.destroy()
      persistence.destroy()
      initRef.current = false
      engineRef.current = null
      persistenceRef.current = null
    }
  }, [engine, persistence])

  return createElement(MemoryContext, { value: engine }, children)
}

// ── Snapshot type ─────────────────────────────────────────────────
interface MemorySnapshot {
  version: number
  engine: MemoryEngine
  stats: EngineStats
  tierBreakdown: TierBreakdown
  recentEvents: EngineEvent[]
  vectorPoints: ProjectedPoint[]
  store: (content: string, namespace: string, metadata?: Record<string, string>) => MemoryEntry
  search: (query: string, options?: SearchOptions) => SearchResult[]
  // Backend-specific
  backendEnabled: boolean
  backendStore: ((content: string, namespace: string, metadata?: Record<string, string>) => Promise<void>) | null
  backendSearch: ((query: string, namespace?: string, limit?: number) => Promise<BackendSearchResult[]>) | null
}

// ── Backend search result shape ──────────────────────────────────
interface BackendSearchResult {
  id: string
  content: string
  namespace: string
  tier: string
  score: number
  similarity: number
  type: string
  origin: string
  createdAt: string
}

// ── Backend store helper ─────────────────────────────────────────
async function backendStoreMemory(
  content: string,
  namespace: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const res = await fetch(`${apiUrl}/api/memory/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: content,
      sessionId: 'agentforge-ui',
      success: true,
      reward: 1.0,
      output: namespace,
      ...metadata
    }),
  })
  
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to store memory in ReasoningBank')
  }
}

// ── Backend search helper ────────────────────────────────────────
async function backendSearchMemories(
  query: string,
  namespace?: string,
  limit?: number,
): Promise<BackendSearchResult[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const res = await fetch(`${apiUrl}/api/memory/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      options: { k: limit ?? 20 }
    }),
  })
  
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to search ReasoningBank')
  }
  
  const data = await res.json()
  const patterns = data.data ?? []

  return patterns.map((p: any) => ({
    id: p.id || String(Date.now()),
    content: p.task || p.content || '',
    namespace: namespace || 'reasoning',
    tier: 'hot',
    score: p.reward || 1.0,
    similarity: p.similarity || 0,
    type: 'reasoning',
    origin: 'agentica',
    createdAt: new Date().toISOString(),
  }))
}

// ── Content hash (browser-side) ──────────────────────────────────
async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Hook ─────────────────────────────────────────────────────────
export function useMemory(): MemorySnapshot {
  const engine = useContext(MemoryContext)
  if (!engine) {
    throw new Error('useMemory must be used within a <MemoryProvider>')
  }

  const versionRef = useRef(0)
  const snapshotRef = useRef<MemorySnapshot | null>(null)

  const subscribe = (onStoreChange: () => void): (() => void) => {
    return engine.subscribe(() => {
      versionRef.current += 1
      snapshotRef.current = null
      onStoreChange()
    })
  }

  const getSnapshot = (): MemorySnapshot => {
    if (snapshotRef.current !== null) {
      return snapshotRef.current
    }

    const snapshot: MemorySnapshot = {
      version: versionRef.current,
      engine,
      stats: engine.getStats(),
      tierBreakdown: engine.getTierBreakdown(),
      recentEvents: engine.getRecentEvents(20),
      vectorPoints: engine.getVectorPoints(),
      store: (content: string, namespace: string, metadata?: Record<string, string>) => {
        const entry = engine.store(content, namespace, metadata)
        if (USE_BACKEND) {
          backendStoreMemory(content, namespace, metadata).catch(err => 
            console.error('[ReasoningBank Sync Error]', err)
          )
        }
        return entry
      },
      search: (query: string, options?: SearchOptions) =>
        engine.search(query, options),
      backendEnabled: USE_BACKEND,
      backendStore: USE_BACKEND ? backendStoreMemory : null,
      backendSearch: USE_BACKEND ? backendSearchMemories : null,
    }

    snapshotRef.current = snapshot
    return snapshot
  }

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ── Supabase real-time hook (subscribe to memory changes) ────────
export function useMemoryRealtime(onMemoryChange: () => void) {
  useEffect(() => {
    if (!USE_BACKEND) return

    const channel = supabase
      .channel('memories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories' },
        () => onMemoryChange(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onMemoryChange])
}

// ── Backend tier breakdown (for when ReasoningBank is the source) ─────
export function useBackendTierBreakdown() {
  const [breakdown, setBreakdown] = useState<{
    hot: Array<{ id: string; content: string; namespace: string; tier: string; score: number }>
    warm: Array<{ id: string; content: string; namespace: string; tier: string; score: number }>
    cold: Array<{ id: string; content: string; namespace: string; tier: string; score: number }>
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBreakdown = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '', options: { k: 100 } }) // fetch recent 100
      })
      if (!res.ok) throw new Error('Failed to fetch breakdown')
      const json = await res.json()
      const entries = (json.data ?? []).map((p: any) => ({
        id: p.id || String(Math.random()),
        content: p.task || p.content || '',
        namespace: 'reasoning',
        tier: p.reward > 0.8 ? 'hot' : p.reward > 0.4 ? 'warm' : 'cold',
        score: p.reward || 1.0,
      }))
      setBreakdown({
        hot: entries.filter((e: any) => e.tier === 'hot'),
        warm: entries.filter((e: any) => e.tier === 'warm'),
        cold: entries.filter((e: any) => e.tier === 'cold'),
        total: entries.length,
      })
    } catch (e) {
      console.error('[useBackendTierBreakdown]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchBreakdown()
  }, [fetchBreakdown])

  // Simple polling instead of supabase realtime
  useEffect(() => {
    const interval = setInterval(fetchBreakdown, 5000)
    return () => clearInterval(interval)
  }, [fetchBreakdown])

  return { breakdown, loading, refetch: fetchBreakdown }
}
