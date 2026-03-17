import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { IntegrationManager } from '../engine/integration-manager.ts'
import type { IntegrationState } from '../engine/integration-manager.ts'
import { useMemory } from './use-memory.ts'

// ── Context ──────────────────────────────────────────────────

const IntegrationContext = createContext<IntegrationManager | null>(null)

// ── Provider ─────────────────────────────────────────────────

interface IntegrationProviderProps {
  children: ReactNode
}

export function IntegrationProvider({ children }: IntegrationProviderProps) {
  const managerRef = useRef<IntegrationManager | null>(null)
  const initRef = useRef(false)
  const { engine } = useMemory()

  if (managerRef.current === null) {
    managerRef.current = new IntegrationManager()
  }

  const manager = managerRef.current

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    let destroyed = false

    async function bootstrap() {
      // Pass the engine's EventBus so integration events appear in Live Feed
      await manager.init(engine.bus)
      if (destroyed) return
    }

    void bootstrap()

    return () => {
      destroyed = true
      manager.destroy()
      initRef.current = false
      managerRef.current = null
    }
  }, [manager, engine])

  return createElement(IntegrationContext, { value: manager }, children)
}

// ── Snapshot type ────────────────────────────────────────────

interface IntegrationSnapshot {
  integrations: IntegrationState[]
  connect: (id: string) => Promise<void>
  disconnect: (id: string) => Promise<void>
  updateConfig: (id: string, config: Record<string, string>) => Promise<void>
  probeAll: () => Promise<void>
}

// ── Hook ─────────────────────────────────────────────────────

export function useIntegrations(): IntegrationSnapshot {
  const manager = useContext(IntegrationContext)
  if (!manager) {
    throw new Error('useIntegrations must be used within an <IntegrationProvider>')
  }

  const subscribe = (onStoreChange: () => void): (() => void) => {
    return manager.subscribe(onStoreChange)
  }

  const getSnapshot = (): IntegrationState[] => {
    return manager.getSnapshot()
  }

  const integrations = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    integrations,
    connect: (id: string) => manager.connect(id),
    disconnect: (id: string) => manager.disconnect(id),
    updateConfig: (id: string, config: Record<string, string>) =>
      manager.updateConfig(id, config),
    probeAll: () => manager.probeAll(),
  }
}
