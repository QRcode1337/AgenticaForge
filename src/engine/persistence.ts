import type { MemoryEntry, SerializedState } from './types.ts'

// ── Duck-typed engine interface (avoids circular import) ─────
interface PersistableEngine {
  getEntries(): MemoryEntry[]
  getVectorStoreState(): {
    vectors: Array<{ id: string; vector: Array<[number, number]> }>
    vocabulary: Array<[string, number]>
    documentFrequencies: Array<[string, number]>
    documentCount: number
  }
  getHNSWState(): Array<{
    id: string
    level: number
    connections: Array<[number, string[]]>
  }>
  getPatternState(): {
    patterns: Array<{
      query: string
      resultIds: string[]
      timestamp: number
      boost: number
    }>
    coOccurrences: Array<{
      pairKey: string
      count: number
      lastSeen: number
    }>
  }
  loadEntries(entries: MemoryEntry[]): void
  loadVectorStoreState(state: {
    vectors: Array<{ id: string; vector: Array<[number, number]> }>
    vocabulary: Array<[string, number]>
    documentFrequencies: Array<[string, number]>
    documentCount: number
  }): void
  loadHNSWState(
    state: Array<{
      id: string
      level: number
      connections: Array<[number, string[]]>
    }>,
    vectors: Map<string, Map<number, number>>,
  ): void
  loadPatternState(state: {
    patterns: Array<{
      query: string
      resultIds: string[]
      timestamp: number
      boost: number
    }>
    coOccurrences: Array<{
      pairKey: string
      count: number
      lastSeen: number
    }>
  }): void
  bus: {
    emit(
      type: string,
      message: string,
      data?: { extra?: Record<string, unknown> },
    ): void
  }
}

// ── Constants ────────────────────────────────────────────────
const DB_NAME = 'agentforge-memory'
const DB_VERSION = 1
const STORE_NAME = 'state'
const STATE_KEY = 'current'
const DEBOUNCE_MS = 500

// ── PersistenceManager ──────────────────────────────────────
export class PersistenceManager {
  private engine: PersistableEngine
  private db: IDBDatabase | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private initialized = false

  constructor(engine: PersistableEngine) {
    this.engine = engine
  }

  async init(): Promise<void> {
    // Idempotent — safe under React StrictMode double-invoke
    if (this.initialized) return
    this.initialized = true

    this.db = await this.openDatabase()

    const existing = await this.load()
    if (existing) {
      this.deserialize(existing)
      this.engine.bus.emit('persist-load', 'State restored from IndexedDB', {
        extra: {
          entries: existing.entries.length,
          vectors: existing.vectors.length,
          patterns: existing.patterns.length,
        },
      })
    }
  }

  async save(): Promise<void> {
    if (!this.db) return

    const state = this.serialize()

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(state, STATE_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    this.engine.bus.emit('persist-write', 'State persisted to IndexedDB', {
      extra: {
        entries: state.entries.length,
        vectors: state.vectors.length,
        patterns: state.patterns.length,
      },
    })
  }

  scheduleSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.save()
    }, DEBOUNCE_MS)
  }

  destroy(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.initialized = false
  }

  // ── Private helpers ──────────────────────────────────────

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private load(): Promise<SerializedState | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null)
        return
      }

      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(STATE_KEY)

      request.onsuccess = () => {
        resolve((request.result as SerializedState) ?? null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  private serialize(): SerializedState {
    const vectorStoreState = this.engine.getVectorStoreState()
    const patternState = this.engine.getPatternState()

    return {
      entries: this.engine.getEntries(),
      vectors: vectorStoreState.vectors,
      hnswNodes: this.engine.getHNSWState(),
      vocabulary: vectorStoreState.vocabulary,
      documentFrequencies: vectorStoreState.documentFrequencies,
      documentCount: vectorStoreState.documentCount,
      patterns: patternState.patterns,
      coOccurrences: patternState.coOccurrences,
      version: 1,
    }
  }

  private deserialize(state: SerializedState): void {
    this.engine.loadEntries(state.entries)

    this.engine.loadVectorStoreState({
      vectors: state.vectors,
      vocabulary: state.vocabulary,
      documentFrequencies: state.documentFrequencies,
      documentCount: state.documentCount,
    })

    // Rebuild vector Map from serialized arrays for HNSW layer
    const vectorMap = new Map<string, Map<number, number>>()
    for (const v of state.vectors) {
      vectorMap.set(v.id, new Map(v.vector))
    }
    this.engine.loadHNSWState(state.hnswNodes, vectorMap)

    this.engine.loadPatternState({
      patterns: state.patterns,
      coOccurrences: state.coOccurrences,
    })
  }
}
