export { MemoryEngine } from './memory-engine.ts'
export { PersistenceManager } from './persistence.ts'
export { EventBus } from './event-bus.ts'
export { SwarmSimulator } from './swarm-simulator.ts'
export { seed } from './seed-data.ts'
export { IntegrationManager } from './integration-manager.ts'
export { IntegrationPersistence } from './integration-persistence.ts'
export { ADAPTERS } from './adapters/index.ts'
export type {
  MemoryEntry,
  SearchResult,
  SearchOptions,
  TierBreakdown,
  EngineStats,
  ProjectedPoint,
  EngineEvent,
  EngineEventType,
  IMemoryEngine,
  SwarmAgent,
  SwarmPhase,
  SwarmAgentRole,
  SwarmAgentStatus,
  SparseVector,
} from './types.ts'
export type { IntegrationState } from './integration-manager.ts'
export type { SavedIntegrationConfig } from './integration-persistence.ts'
export type { AdapterResult, ServiceAdapter } from './adapters/index.ts'
