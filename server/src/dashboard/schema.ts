import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Enums ───────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum('dashboard_task_status', [
  'todo',
  'progress',
  'done',
  'archived',
])

// ── Dashboard Tables ────────────────────────────────────────────

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
    status: taskStatusEnum('status').notNull().default('todo'),
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

// ── Export Types ────────────────────────────────────────────────

export type DashboardTask = typeof dashboardTasks.$inferSelect
export type NewDashboardTask = typeof dashboardTasks.$inferInsert

export type DashboardDeliverable = typeof dashboardDeliverables.$inferSelect
export type NewDashboardDeliverable = typeof dashboardDeliverables.$inferInsert

export type DashboardNote = typeof dashboardNotes.$inferSelect
export type NewDashboardNote = typeof dashboardNotes.$inferInsert

export type DashboardActionLogEntry = typeof dashboardActionLog.$inferSelect
export type NewDashboardActionLogEntry = typeof dashboardActionLog.$inferInsert
