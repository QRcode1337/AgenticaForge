import type { Integration } from '../types/index.ts'
import type { AdapterResult } from './adapters/index.ts'
import { ADAPTERS } from './adapters/index.ts'
import { IntegrationPersistence } from './integration-persistence.ts'
import type { EventBus } from './event-bus.ts'

// ── Extended state per integration ───────────────────────────

export interface IntegrationState extends Integration {
  lastProbe: number
  probing: boolean
  error?: string
}

// ── Default integration definitions ──────────────────────────

const DEFAULT_INTEGRATIONS: Array<{
  id: string
  name: string
  type: Integration['type']
  icon: string
}> = [
  { id: 'openclaw', name: 'OpenClaw', type: 'framework', icon: 'OC' },
  { id: 'claude-flow', name: 'claude-flow', type: 'orchestration', icon: 'CF' },
  { id: 'agentdb', name: 'AgentDB', type: 'memory', icon: 'DB' },
  { id: 'ollama', name: 'Ollama', type: 'model', icon: 'OL' },
  { id: 'anthropic', name: 'Anthropic', type: 'model', icon: 'AN' },
  { id: 'openai', name: 'OpenAI', type: 'model', icon: 'OA' },
  { id: 'custom-rest', name: 'Custom REST', type: 'framework', icon: 'CR' },
  { id: 'huggingface', name: 'HuggingFace', type: 'model', icon: 'HF' },
  { id: 'agentica', name: 'Agentica', type: 'orchestration', icon: 'AF' },
]

// ── Constants ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000

// ── IntegrationManager ──────────────────────────────────────

export class IntegrationManager {
  private integrations = new Map<string, IntegrationState>()
  private subscribers = new Set<() => void>()
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private persistence = new IntegrationPersistence()
  private version = 0
  private cachedSnapshot: IntegrationState[] | null = null
  private bus: EventBus | null = null

  async init(bus?: EventBus): Promise<void> {
    if (bus) this.bus = bus

    await this.persistence.init()

    // Load saved configs
    const saved = await this.persistence.loadAll()
    const savedMap = new Map(saved.map((s) => [s.id, s]))

    // Build initial state for all 6 integrations
    for (const def of DEFAULT_INTEGRATIONS) {
      const adapter = ADAPTERS[def.id]
      const savedConfig = savedMap.get(def.id)

      const state: IntegrationState = {
        id: def.id,
        name: def.name,
        type: def.type,
        status: 'disconnected',
        icon: def.icon,
        config: savedConfig?.config ?? (adapter ? { ...adapter.defaultConfig } : {}),
        lastProbe: 0,
        probing: false,
      }

      this.integrations.set(def.id, state)
    }

    // Auto-probe previously connected services
    const probePromises: Promise<void>[] = []
    for (const saved of savedMap.values()) {
      if (this.integrations.has(saved.id)) {
        probePromises.push(this.connect(saved.id))
      }
    }

    // AgentDB is always auto-connected
    probePromises.push(this.connect('agentdb'))

    await Promise.allSettled(probePromises)

    // Start health polling
    this.startPolling()
  }

  // ── Subscribe (useSyncExternalStore) ───────────────────────

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  getSnapshot(): IntegrationState[] {
    if (this.cachedSnapshot !== null) {
      return this.cachedSnapshot
    }
    this.cachedSnapshot = [...this.integrations.values()]
    return this.cachedSnapshot
  }

  // ── Actions ────────────────────────────────────────────────

  async connect(id: string): Promise<void> {
    const state = this.integrations.get(id)
    if (!state) return

    const adapter = ADAPTERS[id]
    if (!adapter) return

    // Mark as probing
    state.probing = true
    this.invalidate()

    let result: AdapterResult
    try {
      result = await adapter.probe(state.config)
    } catch {
      result = { ok: false, info: {}, error: 'Probe failed unexpectedly' }
    }

    state.probing = false
    state.lastProbe = Date.now()

    if (result.ok) {
      state.status = 'connected'
      state.error = undefined
      // Merge adapter info into config for display
      state.config = { ...state.config, ...result.info }

      // Persist successful config
      this.persistence.scheduleSave(id, state.config)

      this.bus?.emit('integration-connected', `${state.name} connected`, {
        extra: { id, info: result.info },
      })
    } else {
      state.status = 'error'
      state.error = result.error
      this.bus?.emit('integration-error', `${state.name}: ${result.error}`, {
        extra: { id, error: result.error },
      })
    }

    this.invalidate()
  }

  async disconnect(id: string): Promise<void> {
    const state = this.integrations.get(id)
    if (!state) return

    const adapter = ADAPTERS[id]
    if (adapter?.disconnect) {
      await adapter.disconnect()
    }

    state.status = 'disconnected'
    state.error = undefined

    // Remove saved config so it doesn't auto-reconnect on next load
    await this.persistence.remove(id)

    this.bus?.emit('integration-disconnected', `${state.name} disconnected`, {
      extra: { id },
    })

    this.invalidate()
  }

  async updateConfig(id: string, config: Record<string, string>): Promise<void> {
    const state = this.integrations.get(id)
    if (!state) return

    state.config = { ...state.config, ...config }
    this.persistence.scheduleSave(id, state.config)
    this.invalidate()
  }

  async probeAll(): Promise<void> {
    const probes: Promise<void>[] = []
    for (const state of this.integrations.values()) {
      if (state.status === 'connected') {
        probes.push(this.probeOne(state.id))
      }
    }
    await Promise.allSettled(probes)
  }

  // ── Lifecycle ──────────────────────────────────────────────

  destroy(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.persistence.destroy()
    this.subscribers.clear()
  }

  // ── Internal ───────────────────────────────────────────────

  private async probeOne(id: string): Promise<void> {
    const state = this.integrations.get(id)
    if (!state) return

    const adapter = ADAPTERS[id]
    if (!adapter) return

    state.probing = true
    this.invalidate()

    let result: AdapterResult
    try {
      result = await adapter.probe(state.config)
    } catch {
      result = { ok: false, info: {}, error: 'Probe failed' }
    }

    state.probing = false
    state.lastProbe = Date.now()

    if (result.ok) {
      state.status = 'connected'
      state.error = undefined
      state.config = { ...state.config, ...result.info }
    } else {
      state.status = 'error'
      state.error = result.error
      this.bus?.emit('integration-error', `${state.name} health check failed: ${result.error}`, {
        extra: { id, error: result.error },
      })
    }

    this.invalidate()
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      void this.probeAll()
    }, POLL_INTERVAL_MS)
  }

  private invalidate(): void {
    this.version++
    this.cachedSnapshot = null
    for (const cb of this.subscribers) {
      cb()
    }
  }
}
