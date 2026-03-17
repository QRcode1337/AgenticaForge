import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  integer,
  jsonb,
  timestamp,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Enums ───────────────────────────────────────────────────────

export const memoryTierEnum = pgEnum('memory_tier', ['hot', 'warm', 'cold'])

export const memoryTypeEnum = pgEnum('memory_type', [
  'fact',
  'decision',
  'run_summary',
  'artifact',
  'pattern',
  'tool_trace',
])

export const memoryOriginEnum = pgEnum('memory_origin', [
  'human',
  'agent',
  'sim',
])

export const memoryVisibilityEnum = pgEnum('memory_visibility', [
  'private',
  'shared',
])

export const embeddingStatusEnum = pgEnum('embedding_status', [
  'pending',
  'ready',
  'failed',
])

export const agentRoleEnum = pgEnum('agent_role', [
  'scout',
  'worker',
  'coordinator',
  'specialist',
  'guardian',
])

export const swarmStatusEnum = pgEnum('swarm_status', [
  'queued',
  'running',
  'completed',
  'failed',
])

export const swarmPhaseEnum = pgEnum('swarm_phase', [
  'discovery',
  'analysis',
  'synthesis',
  'optimization',
])

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'active',
  'completed',
  'error',
  'retrying',
])

export const messageRoleEnum = pgEnum('message_role', [
  'system',
  'user',
  'assistant',
  'tool',
])

// ── Memories ────────────────────────────────────────────────────
// Server-side memory store. Embeddings filled async by worker.

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    content: text('content').notNull(),
    namespace: text('namespace').notNull(),
    tier: memoryTierEnum('tier').notNull().default('hot'),
    type: memoryTypeEnum('type').notNull().default('fact'),
    origin: memoryOriginEnum('origin').notNull().default('human'),
    visibility: memoryVisibilityEnum('visibility').notNull().default('private'),
    score: doublePrecision('score').default(1.0),
    accessCount: integer('access_count').default(0),
    metadata: jsonb('metadata').$type<Record<string, string>>(),

    // Embedding — async: inserted as pending, worker fills vector
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingStatus: embeddingStatusEnum('embedding_status').notNull().default('pending'),
    embeddingModel: text('embedding_model'),

    // Dedupe + TTL
    contentHash: text('content_hash'),
    ttlSeconds: integer('ttl_seconds'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('memories_user_namespace_idx').on(table.userId, table.namespace),
    index('memories_tier_idx').on(table.tier),
    index('memories_embedding_status_idx').on(table.embeddingStatus),
  ],
)

// ── Agents ──────────────────────────────────────────────────────

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  role: agentRoleEnum('role').notNull().default('worker'),
  systemPrompt: text('system_prompt'),
  model: text('model').default('claude-sonnet-4-5-20250929'),
  tools: text('tools').array(),
  config: jsonb('config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Swarm Runs ──────────────────────────────────────────────────

export const swarmRuns = pgTable('swarm_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  status: swarmStatusEnum('status').notNull().default('queued'),
  phase: swarmPhaseEnum('phase').notNull().default('discovery'),
  config: jsonb('config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

// ── Agent Tasks ─────────────────────────────────────────────────
// Task queue with lease-based execution for crash recovery.

export const agentTasks = pgTable(
  'agent_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    swarmRunId: uuid('swarm_run_id')
      .notNull()
      .references(() => swarmRuns.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    status: taskStatusEnum('status').notNull().default('pending'),
    phase: swarmPhaseEnum('phase').notNull(),
    input: jsonb('input').$type<{
      prompt: string
      context?: string
      tools?: string[]
      dependencies?: string[]
    }>(),
    output: jsonb('output').$type<{
      response?: string
      toolResults?: unknown[]
      memoriesStored?: string[]
    }>(),
    tokensUsed: integer('tokens_used'),

    // Lease fields — crash recovery + retry
    leasedAt: timestamp('leased_at', { withTimezone: true }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    leaseToken: uuid('lease_token'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    lastError: text('last_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('agent_tasks_pending_idx')
      .on(table.status)
      .where(sql`status = 'pending'`),
    index('agent_tasks_lease_idx')
      .on(table.leaseExpiresAt)
      .where(sql`status = 'active'`),
  ],
)

// ── Messages ────────────────────────────────────────────────────
// Conversation history + tool traces (no private reasoning).

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => agentTasks.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content'),
  toolCalls: jsonb('tool_calls').$type<unknown[]>(),
  reasoningSummary: text('reasoning_summary'),
  tokens: integer('tokens'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Artifacts ───────────────────────────────────────────────────
// Files & outputs produced by agents

export const artifacts = pgTable('artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => agentTasks.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  mimeType: text('mime_type'),
  storagePath: text('storage_path'),
  sizeBytes: integer('size_bytes'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Events ──────────────────────────────────────────────────────
// Powers Live Feed. Retention: cron deletes rows older than
// retain_days (default 30). Partition by month if scale demands.

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    type: text('type').notNull(),
    swarmRunId: uuid('swarm_run_id').references(() => swarmRuns.id, {
      onDelete: 'set null',
    }),
    agentId: text('agent_id'),
    agentName: text('agent_name'),
    message: text('message'),
    data: jsonb('data').$type<Record<string, unknown>>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).default(sql`now() + interval '30 days'`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('events_user_created_idx').on(table.userId, table.createdAt),
    index('events_expires_idx')
      .on(table.expiresAt)
      .where(sql`expires_at IS NOT NULL`),
  ],
)

// ── Credentials ─────────────────────────────────────────────────
// Encrypted API keys. Never returned to client — only "configured: true".

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  service: text('service').notNull(),
  encryptedKey: text('encrypted_key'),
  keyVersion: integer('key_version').default(1),
  iv: text('iv'),
  config: jsonb('config').$type<Record<string, unknown>>(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Dashboard Tables (ErisMorn Dashboard) ──────────────────────

export const dashboardTaskStatusEnum = pgEnum('dashboard_task_status', [
  'todo',
  'progress',
  'done',
  'archived',
])

/**
 * Tasks for kanban board
 * Tracks user tasks with status and position for drag-and-drop ordering
 */
export const dashboardTasks = pgTable(
  'dashboard_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    date: text('date').notNull(),
    status: dashboardTaskStatusEnum('status').notNull().default('todo'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('dashboard_tasks_user_status_idx').on(table.userId, table.status),
    index('dashboard_tasks_user_position_idx').on(table.userId, table.position),
  ]
)

/**
 * Deliverables and artifacts
 * Represents completed work items with categorization
 */
export const dashboardDeliverables = pgTable(
  'dashboard_deliverables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    date: text('date').notNull(),
    icon: text('icon').notNull(),
    type: text('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('dashboard_deliverables_user_date_idx').on(table.userId, table.date),
  ]
)

/**
 * Notes for ErisMorn
 * Quick notes and reminders that can be checked on every heartbeat
 */
export const dashboardNotes = pgTable(
  'dashboard_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    content: text('content').notNull(),
    completed: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('dashboard_notes_user_created_idx').on(table.userId, table.createdAt),
  ]
)

/**
 * Action log entries
 * Timeline of actions with auto-expiration after 30 days
 */
export const dashboardActionLog = pgTable(
  'dashboard_action_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    timestamp: text('timestamp').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .default(sql`now() + interval '30 days'`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('dashboard_action_log_user_created_idx').on(table.userId, table.createdAt),
    index('dashboard_action_log_expires_idx')
      .on(table.expiresAt)
      .where(sql`expires_at IS NOT NULL`),
  ]
)
