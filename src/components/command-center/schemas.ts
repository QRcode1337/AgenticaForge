import type { ActionType, ActionSchema, FieldSchema } from './types.ts'

// ── Domain / Verb Registry ──────────────────────────────────

export const DOMAINS = ['mem', 'swarm', 'db', 'agentica'] as const

export const DOMAIN_VERBS: Record<string, string[]> = {
  mem:   ['store', 'search', 'stats', 'tiers', 'namespaces', 'delete', 'purge-cold'],
  swarm: ['start', 'stop', 'status', 'agents'],
  db:    ['stats', 'patterns', 'export'],
  agentica: ['catalog', 'status', 'providers'],
}

export const GRAMMAR_MAP = new Map<string, ActionType>([
  ['mem:store',       'MEMORY_STORE'],
  ['mem:search',      'MEMORY_SEARCH'],
  ['mem:stats',       'MEMORY_STATS'],
  ['mem:tiers',       'MEMORY_TIERS'],
  ['mem:namespaces',  'MEMORY_NAMESPACES'],
  ['mem:delete',      'MEMORY_DELETE'],
  ['mem:purge-cold',  'MEMORY_PURGE_COLD'],
  ['swarm:start',     'SWARM_START'],
  ['swarm:stop',      'SWARM_STOP'],
  ['swarm:status',    'SWARM_STATUS'],
  ['swarm:agents',    'SWARM_AGENTS'],
  ['db:stats',        'DB_STATS'],
  ['db:patterns',     'DB_PATTERNS'],
  ['db:export',       'DB_EXPORT'],
  ['agentica:catalog',    'AGENTICA_CATALOG'],
  ['agentica:status',     'AGENTICA_STATUS'],
  ['agentica:providers',  'AGENTICA_PROVIDERS'],
  ['help',            'UTILITY_HELP'],
  ['clear',           'UTILITY_CLEAR'],
])

export const DESTRUCTIVE_ACTIONS = new Set<ActionType>([
  'MEMORY_DELETE',
  'MEMORY_PURGE_COLD',
  'DB_EXPORT',
])

// ── 19 Action Schemas ───────────────────────────────────────

const SCHEMAS: ActionSchema[] = [
  {
    action: 'MEMORY_STORE',
    domain: 'mem',
    verb: 'store',
    description: 'Store a new memory entry',
    destructive: false,
    fields: [
      { name: 'ns', type: 'string', required: true, label: 'Namespace', placeholder: 'project:agentforge' },
      { name: 'type', type: 'select', required: false, label: 'Type', options: ['observation', 'decision', 'insight', 'error'], default: 'observation' },
      { name: 'tags', type: 'string', required: false, label: 'Tags', placeholder: 'comma,separated' },
      { name: 'tier', type: 'select', required: false, label: 'Tier', options: ['hot', 'warm', 'cold'], default: 'hot' },
      { name: 'content', type: 'string', required: true, label: 'Content', placeholder: 'Memory content text...' },
    ],
    flags: ['ns', 'type', 'tags', 'tier'],
  },
  {
    action: 'MEMORY_SEARCH',
    domain: 'mem',
    verb: 'search',
    description: 'Semantic search via TF-IDF + HNSW',
    destructive: false,
    fields: [
      { name: 'query', type: 'string', required: true, label: 'Query', placeholder: 'Search query...' },
      { name: 'ns', type: 'string', required: false, label: 'Namespace', placeholder: 'Filter by namespace' },
      { name: 'type', type: 'string', required: false, label: 'Type', placeholder: 'Filter by type' },
      { name: 'limit', type: 'number', required: false, label: 'Limit', default: '5' },
    ],
    flags: ['ns', 'type', 'limit'],
  },
  {
    action: 'MEMORY_STATS',
    domain: 'mem',
    verb: 'stats',
    description: 'Engine statistics',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'MEMORY_TIERS',
    domain: 'mem',
    verb: 'tiers',
    description: 'Tier breakdown (hot/warm/cold)',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'MEMORY_NAMESPACES',
    domain: 'mem',
    verb: 'namespaces',
    description: 'List active namespaces',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'MEMORY_DELETE',
    domain: 'mem',
    verb: 'delete',
    description: 'Delete a memory entry by ID',
    destructive: true,
    fields: [
      { name: 'id', type: 'string', required: true, label: 'Entry ID', placeholder: 'mem-...' },
    ],
    flags: [],
  },
  {
    action: 'MEMORY_PURGE_COLD',
    domain: 'mem',
    verb: 'purge-cold',
    description: 'Remove all cold-tier entries',
    destructive: true,
    fields: [],
    flags: [],
  },
  {
    action: 'SWARM_START',
    domain: 'swarm',
    verb: 'start',
    description: 'Launch 15-agent 4-phase simulation',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'SWARM_STOP',
    domain: 'swarm',
    verb: 'stop',
    description: 'Halt simulation',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'SWARM_STATUS',
    domain: 'swarm',
    verb: 'status',
    description: 'Swarm phase & agent counts',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'SWARM_AGENTS',
    domain: 'swarm',
    verb: 'agents',
    description: 'List all swarm agents',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'DB_STATS',
    domain: 'db',
    verb: 'stats',
    description: 'HNSW layers, vectors, patterns',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'DB_PATTERNS',
    domain: 'db',
    verb: 'patterns',
    description: 'Pattern tracker statistics',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'DB_EXPORT',
    domain: 'db',
    verb: 'export',
    description: 'Export engine state to console',
    destructive: true,
    fields: [
      { name: 'format', type: 'select', required: false, label: 'Format', options: ['json', 'summary'], default: 'json' },
      { name: 'scope', type: 'select', required: false, label: 'Scope', options: ['all', 'entries', 'vectors', 'patterns'], default: 'all' },
    ],
    flags: ['format', 'scope'],
  },
  {
    action: 'AGENTICA_CATALOG',
    domain: 'agentica',
    verb: 'catalog',
    description: 'Browse Agentica agent templates',
    destructive: false,
    fields: [
      { name: 'category', type: 'select', required: false, label: 'Category', options: ['core', 'research', 'devops', 'consensus', 'optimization', 'reasoning', 'swarm', 'github'] },
    ],
    flags: ['category'],
  },
  {
    action: 'AGENTICA_STATUS',
    domain: 'agentica',
    verb: 'status',
    description: 'Agentica router and catalog status',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'AGENTICA_PROVIDERS',
    domain: 'agentica',
    verb: 'providers',
    description: 'List supported LLM providers',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'UTILITY_HELP',
    domain: '',
    verb: 'help',
    description: 'Show available commands',
    destructive: false,
    fields: [],
    flags: [],
  },
  {
    action: 'UTILITY_CLEAR',
    domain: '',
    verb: 'clear',
    description: 'Clear terminal output',
    destructive: false,
    fields: [],
    flags: [],
  },
]

// ── Registry ────────────────────────────────────────────────

export const ACTION_REGISTRY = new Map<ActionType, ActionSchema>(
  SCHEMAS.map((s) => [s.action, s]),
)

// ── Validation ──────────────────────────────────────────────

export function validatePayload(
  action: ActionType,
  payload: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const schema = ACTION_REGISTRY.get(action)
  if (!schema) return { valid: false, errors: [`Unknown action: ${action}`] }

  const errors: string[] = []
  const validKeys = new Set(schema.fields.map((f) => f.name))

  // Check required fields
  for (const field of schema.fields) {
    if (field.required) {
      const val = payload[field.name]
      if (val === undefined || val === null || val === '') {
        errors.push(`Required field missing: ${field.label}`)
      }
    }
    // Check numeric type
    if (field.type === 'number' && payload[field.name] !== undefined) {
      const n = Number(payload[field.name])
      if (Number.isNaN(n)) {
        errors.push(`${field.label} must be a number`)
      }
    }
  }

  // Reject unknown keys
  for (const key of Object.keys(payload)) {
    if (!validKeys.has(key)) {
      errors.push(`Unknown field: ${key}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function getFieldsForAction(action: ActionType): FieldSchema[] {
  return ACTION_REGISTRY.get(action)?.fields ?? []
}

export function getFlagsForAction(action: ActionType): string[] {
  return ACTION_REGISTRY.get(action)?.flags ?? []
}
