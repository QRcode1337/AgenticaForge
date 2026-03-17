import type { EngineEvent, EngineEventType } from './types.ts'

const MAX_HISTORY = 500

export class EventBus {
  private listeners = new Map<string, Set<(event: EngineEvent) => void>>()
  private history: EngineEvent[] = new Array<EngineEvent>(MAX_HISTORY)
  private historyIndex = 0
  private historySize = 0
  private idCounter = 0

  // ── Subscribe ────────────────────────────────────────────────
  on(type: string, callback: (event: EngineEvent) => void): () => void {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(callback)

    return () => {
      set!.delete(callback)
      if (set!.size === 0) {
        this.listeners.delete(type)
      }
    }
  }

  // ── Emit ─────────────────────────────────────────────────────
  emit(
    type: EngineEventType,
    message: string,
    data?: { agentId?: string; agentName?: string; extra?: Record<string, unknown> },
  ): EngineEvent {
    const event: EngineEvent = {
      id: `evt-${++this.idCounter}`,
      type,
      timestamp: Date.now(),
      message,
    }

    if (data?.agentId) event.agentId = data.agentId
    if (data?.agentName) event.agentName = data.agentName
    if (data?.extra) event.data = data.extra

    // Write into circular buffer
    this.history[this.historyIndex] = event
    this.historyIndex = (this.historyIndex + 1) % MAX_HISTORY
    if (this.historySize < MAX_HISTORY) this.historySize++

    // Notify listeners
    this.notifyListeners(type, event)

    return event
  }

  // ── History ──────────────────────────────────────────────────
  getHistory(limit?: number): EngineEvent[] {
    const count = limit !== undefined ? Math.min(limit, this.historySize) : this.historySize
    const result: EngineEvent[] = new Array<EngineEvent>(count)

    // Read backwards from most recent entry
    for (let i = 0; i < count; i++) {
      const idx = (this.historyIndex - 1 - i + MAX_HISTORY) % MAX_HISTORY
      result[i] = this.history[idx]
    }

    return result
  }

  // ── Clear ────────────────────────────────────────────────────
  clear(): void {
    this.history = new Array<EngineEvent>(MAX_HISTORY)
    this.historyIndex = 0
    this.historySize = 0
    this.idCounter = 0
  }

  // ── Destroy ──────────────────────────────────────────────────
  destroy(): void {
    this.listeners.clear()
    this.history = new Array<EngineEvent>(MAX_HISTORY)
    this.historyIndex = 0
    this.historySize = 0
    this.idCounter = 0
  }

  // ── Internal: notify matching listeners ──────────────────────
  private notifyListeners(type: string, event: EngineEvent): void {
    // Exact type match
    const exact = this.listeners.get(type)
    if (exact) {
      for (const cb of exact) cb(event)
    }

    // Wildcard * (all events)
    if (type !== '*') {
      const wildcard = this.listeners.get('*')
      if (wildcard) {
        for (const cb of wildcard) cb(event)
      }
    }

    // Prefix wildcards like "swarm-*"
    for (const [key, set] of this.listeners) {
      if (key === '*' || key === type) continue
      if (key.endsWith('*') && type.startsWith(key.slice(0, -1))) {
        for (const cb of set) cb(event)
      }
    }
  }
}
