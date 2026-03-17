import type {
  MemoryEntry,
  SearchResult,
  SearchOptions,
  TierBreakdown,
  EngineStats,
  ProjectedPoint,
  EngineEvent,
  IMemoryEngine,
  DecayConfig,
} from './types.ts'
import { VectorStore } from './vector-store.ts'
import { HNSWIndex } from './hnsw-index.ts'
import {
  computeDecayedScore,
  computeTier,
  batchApplyDecay,
  DEFAULT_DECAY_CONFIG,
} from './temporal-decay.ts'
import { PatternTracker } from './pattern-tracker.ts'
import { EventBus } from './event-bus.ts'

let idCounter = 0
function nextId(): string {
  return `mem-${Date.now()}-${++idCounter}`
}

export class MemoryEngine implements IMemoryEngine {
  private entries: Map<string, MemoryEntry> = new Map()
  private vectorStore = new VectorStore()
  private hnswIndex = new HNSWIndex()
  private patternTracker = new PatternTracker()
  readonly bus = new EventBus()

  private subscribers = new Set<() => void>()
  private notifyScheduled = false
  private decayTimer: ReturnType<typeof setInterval> | null = null
  private decayConfig: DecayConfig

  constructor(decayConfig?: Partial<DecayConfig>) {
    this.decayConfig = { ...DEFAULT_DECAY_CONFIG, ...decayConfig }
    this.startDecayTimer()
  }

  // ── Core: store ─────────────────────────────────────────────
  store(
    content: string,
    namespace: string,
    metadata: Record<string, string> = {},
  ): MemoryEntry {
    const now = Date.now()
    const id = nextId()

    const entry: MemoryEntry = {
      id,
      content,
      namespace,
      tier: 'hot',
      score: 1.0,
      accessCount: 0,
      createdAt: now,
      lastAccessedAt: now,
      metadata,
    }

    this.entries.set(id, entry)

    // Vectorize and index
    const vectorEntry = this.vectorStore.store(id, content)
    this.hnswIndex.insert(id, vectorEntry.vector)

    this.bus.emit('store', `Stored "${content.slice(0, 40)}…" in ${namespace}`, {
      extra: { id, namespace },
    })
    this.bus.emit('hnsw-insert', `HNSW indexed ${id}`, {
      extra: { id, layers: this.hnswIndex.getLayerCount() },
    })

    this.scheduleNotify()
    return entry
  }

  // ── Core: search ────────────────────────────────────────────
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const { namespace, tier, limit = 10, minScore = 0 } = options
    const now = Date.now()

    // TF-IDF similarity search
    const vectorResults = this.vectorStore.search(query, this.entries.size)

    const results: SearchResult[] = []

    for (const { id, similarity } of vectorResults) {
      const entry = this.entries.get(id)
      if (!entry) continue

      // Filter by namespace / tier
      if (namespace && entry.namespace !== namespace) continue
      if (tier && entry.tier !== tier) continue

      const decayedScore = computeDecayedScore(entry, now, this.decayConfig)
      const patternBoost = this.patternTracker.getBoost(query, id)

      const finalScore =
        0.5 * similarity + 0.3 * decayedScore + 0.2 * patternBoost

      if (finalScore < minScore) continue

      results.push({
        entry: { ...entry, score: decayedScore, tier: computeTier(decayedScore, this.decayConfig) },
        similarity,
        decayedScore,
        patternBoost,
        finalScore,
      })
    }

    results.sort((a, b) => b.finalScore - a.finalScore)
    const topResults = results.slice(0, limit)

    // Track pattern for future boosts
    const resultIds = topResults.map((r) => r.entry.id)
    this.patternTracker.record(query, resultIds)

    // Touch accessed entries
    for (const r of topResults) {
      const entry = this.entries.get(r.entry.id)
      if (entry) {
        entry.accessCount++
        entry.lastAccessedAt = now
      }
    }

    this.bus.emit('search', `Search: "${query}" → ${topResults.length} results`, {
      extra: { query, resultCount: topResults.length },
    })

    this.scheduleNotify()
    return topResults
  }

  // ── Core: get ───────────────────────────────────────────────
  get(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id)
    if (!entry) return undefined

    entry.accessCount++
    entry.lastAccessedAt = Date.now()
    return { ...entry }
  }

  // ── Core: delete ────────────────────────────────────────────
  delete(id: string): boolean {
    const existed = this.entries.delete(id)
    if (!existed) return false

    this.vectorStore.delete(id)
    this.hnswIndex.delete(id)

    this.bus.emit('delete', `Deleted entry ${id}`, { extra: { id } })
    this.scheduleNotify()
    return true
  }

  // ── Core: update ────────────────────────────────────────────
  update(id: string, content: string): MemoryEntry | undefined {
    const entry = this.entries.get(id)
    if (!entry) return undefined

    // Remove old vector/index
    this.vectorStore.delete(id)
    this.hnswIndex.delete(id)

    // Update entry
    entry.content = content
    entry.lastAccessedAt = Date.now()
    entry.accessCount++

    // Re-vectorize and re-index
    const vectorEntry = this.vectorStore.store(id, content)
    this.hnswIndex.insert(id, vectorEntry.vector)

    this.bus.emit('update', `Updated entry ${id}`, { extra: { id } })
    this.scheduleNotify()
    return { ...entry }
  }

  // ── Queries: tier breakdown ─────────────────────────────────
  getTierBreakdown(): TierBreakdown {
    const hot: MemoryEntry[] = []
    const warm: MemoryEntry[] = []
    const cold: MemoryEntry[] = []

    for (const entry of this.entries.values()) {
      switch (entry.tier) {
        case 'hot':
          hot.push(entry)
          break
        case 'warm':
          warm.push(entry)
          break
        case 'cold':
          cold.push(entry)
          break
      }
    }

    return { hot, warm, cold, total: this.entries.size }
  }

  // ── Queries: stats ──────────────────────────────────────────
  getStats(): EngineStats {
    const breakdown = this.getTierBreakdown()
    return {
      entryCount: this.entries.size,
      vectorDimensions: this.entries.size,
      hnswLayers: this.hnswIndex.getLayerCount(),
      patternCount: this.patternTracker.getPatternCount(),
      tierBreakdown: {
        hot: breakdown.hot.length,
        warm: breakdown.warm.length,
        cold: breakdown.cold.length,
      },
    }
  }

  // ── Queries: vector points for 3D viz ───────────────────────
  getVectorPoints(): ProjectedPoint[] {
    const labels = new Map<string, { label: string; namespace: string }>()
    for (const entry of this.entries.values()) {
      labels.set(entry.id, {
        label: entry.content.slice(0, 30),
        namespace: entry.namespace,
      })
    }
    return this.vectorStore.getProjectedPoints(labels)
  }

  // ── Queries: recent events ──────────────────────────────────
  getRecentEvents(limit?: number): EngineEvent[] {
    return this.bus.getHistory(limit)
  }

  // ── Lifecycle: subscribe ────────────────────────────────────
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // ── Lifecycle: destroy ──────────────────────────────────────
  destroy(): void {
    if (this.decayTimer !== null) {
      clearInterval(this.decayTimer)
      this.decayTimer = null
    }
    this.bus.destroy()
    this.subscribers.clear()
  }

  // ── Persistence helpers ─────────────────────────────────────
  getEntries(): MemoryEntry[] {
    return [...this.entries.values()]
  }

  getVectorStoreState() {
    return this.vectorStore.getSerializableState()
  }

  getHNSWState() {
    return this.hnswIndex.getSerializableState()
  }

  getPatternState() {
    return this.patternTracker.getSerializableState()
  }

  loadEntries(entries: MemoryEntry[]): void {
    this.entries.clear()
    for (const entry of entries) {
      this.entries.set(entry.id, entry)
    }
  }

  loadVectorStoreState(state: ReturnType<VectorStore['getSerializableState']>): void {
    this.vectorStore.loadState(state)
  }

  loadHNSWState(
    state: ReturnType<HNSWIndex['getSerializableState']>,
    vectors: Map<string, Map<number, number>>,
  ): void {
    this.hnswIndex.loadState(state, vectors)
  }

  loadPatternState(state: ReturnType<PatternTracker['getSerializableState']>): void {
    this.patternTracker.loadState(state)
  }

  // ── Internal: batched notification ──────────────────────────
  private scheduleNotify(): void {
    if (this.notifyScheduled) return
    this.notifyScheduled = true
    queueMicrotask(() => {
      this.notifyScheduled = false
      for (const cb of this.subscribers) {
        cb()
      }
    })
  }

  // ── Internal: decay timer ───────────────────────────────────
  private startDecayTimer(): void {
    // Tick every 30 seconds
    this.decayTimer = setInterval(() => {
      this.runDecayTick()
    }, 30_000)
  }

  private runDecayTick(): void {
    const allEntries = [...this.entries.values()]
    if (allEntries.length === 0) return

    const now = Date.now()
    const { updated, tierChanges } = batchApplyDecay(allEntries, now, this.decayConfig)

    for (const entry of updated) {
      this.entries.set(entry.id, entry)
    }

    if (tierChanges.length > 0) {
      for (const change of tierChanges) {
        this.bus.emit('tier-change', `${change.id}: ${change.from} → ${change.to}`, {
          extra: { entryId: change.id, from: change.from, to: change.to },
        })
      }
    }

    this.bus.emit('decay-tick', `Decay tick: ${allEntries.length} entries processed`, {
      extra: { count: allEntries.length, changes: tierChanges.length },
    })

    if (tierChanges.length > 0) {
      this.scheduleNotify()
    }
  }
}
