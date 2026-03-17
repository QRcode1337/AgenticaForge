// ── Action System Types ──────────────────────────────────────

export type ActionType =
  | 'MEMORY_STORE'
  | 'MEMORY_SEARCH'
  | 'MEMORY_STATS'
  | 'MEMORY_TIERS'
  | 'MEMORY_NAMESPACES'
  | 'MEMORY_DELETE'
  | 'MEMORY_PURGE_COLD'
  | 'SWARM_START'
  | 'SWARM_STOP'
  | 'SWARM_STATUS'
  | 'SWARM_AGENTS'
  | 'DB_STATS'
  | 'DB_PATTERNS'
  | 'DB_EXPORT'
  | 'AGENTICA_CATALOG'
  | 'AGENTICA_STATUS'
  | 'AGENTICA_PROVIDERS'
  | 'UTILITY_HELP'
  | 'UTILITY_CLEAR'

export type ActionSource = 'terminal' | 'quick_action'

export interface ActionEnvelope {
  action: ActionType
  run_id: string
  timestamp: string
  source: ActionSource
  payload: Record<string, unknown>
  policy: { confirm_required: boolean }
}

export type ResultMessageType = 'INFO' | 'ERROR' | 'MEMORY' | 'TOOL' | 'DECISION' | 'REWARD'

export interface ResultMessage {
  type: ResultMessageType
  text: string
  data?: Record<string, unknown>
}

export interface ActionResult {
  run_id: string
  status: 'ok' | 'error' | 'partial'
  messages: ResultMessage[]
  metrics: { latency_ms: number }
}

export type ActionHandler = (envelope: ActionEnvelope) => ActionResult

export interface RunLogEntry {
  envelope: ActionEnvelope
  result: ActionResult
}

// ── Parsed Command ──────────────────────────────────────────

export interface ParsedCommand {
  domain: string | null
  verb: string | null
  flags: Record<string, string>
  content: string
  raw: string
}

export interface Suggestion {
  text: string
  description: string
  kind: 'domain' | 'verb' | 'flag'
}

// ── Action Schema ───────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'select'

export interface FieldSchema {
  name: string
  type: FieldType
  required: boolean
  label: string
  placeholder?: string
  options?: string[]
  default?: string
}

export interface ActionSchema {
  action: ActionType
  domain: string
  verb: string
  description: string
  destructive: boolean
  fields: FieldSchema[]
  flags: string[]
}

// ── Terminal Line ───────────────────────────────────────────

export type TerminalLineKind =
  | 'input'
  | 'info'
  | 'error'
  | 'success'
  | 'heading'
  | 'dim'
  | 'data'

export interface TerminalLine {
  id: string
  kind: TerminalLineKind
  text: string
  run_id?: string
  data?: Record<string, unknown>
}
