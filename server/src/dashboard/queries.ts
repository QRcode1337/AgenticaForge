import { db } from '../../db/index.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import {
  dashboardTasks,
  dashboardDeliverables,
  dashboardNotes,
  dashboardActionLog,
  type DashboardTask,
  type NewDashboardTask,
  type DashboardDeliverable,
  type NewDashboardDeliverable,
  type DashboardNote,
  type NewDashboardNote,
  type DashboardActionLogEntry,
  type NewDashboardActionLogEntry,
} from './schema'

// ── Task Queries ────────────────────────────────────────────────

/**
 * Get all tasks for a user
 */
export async function getTasks(userId: string): Promise<DashboardTask[]> {
  return db
    .select()
    .from(dashboardTasks)
    .where(eq(dashboardTasks.userId, userId))
    .orderBy(dashboardTasks.position)
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  task: Omit<NewDashboardTask, 'userId' | 'id' | 'createdAt' | 'updatedAt'>
): Promise<DashboardTask> {
  const [newTask] = await db
    .insert(dashboardTasks)
    .values({ ...task, userId })
    .returning()
  return newTask
}

/**
 * Update task (for status changes, title edits, etc.)
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Pick<DashboardTask, 'title' | 'date' | 'status' | 'position'>>
): Promise<DashboardTask | null> {
  const [updated] = await db
    .update(dashboardTasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(dashboardTasks.id, taskId))
    .returning()
  return updated || null
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  const result = await db
    .delete(dashboardTasks)
    .where(eq(dashboardTasks.id, taskId))
  return (result.rowCount ?? 0) > 0
}

/**
 * Reorder tasks (for drag-and-drop)
 */
export async function reorderTasks(
  userId: string,
  taskUpdates: { id: string; position: number }[]
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const { id, position } of taskUpdates) {
      await tx
        .update(dashboardTasks)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(dashboardTasks.id, id), eq(dashboardTasks.userId, userId)))
    }
  })
}

// ── Deliverable Queries ─────────────────────────────────────────

/**
 * Get all deliverables for a user
 */
export async function getDeliverables(userId: string): Promise<DashboardDeliverable[]> {
  return db
    .select()
    .from(dashboardDeliverables)
    .where(eq(dashboardDeliverables.userId, userId))
    .orderBy(desc(dashboardDeliverables.createdAt))
}

/**
 * Create a new deliverable
 */
export async function createDeliverable(
  userId: string,
  deliverable: Omit<NewDashboardDeliverable, 'userId' | 'id' | 'createdAt' | 'updatedAt'>
): Promise<DashboardDeliverable> {
  const [newDeliverable] = await db
    .insert(dashboardDeliverables)
    .values({ ...deliverable, userId })
    .returning()
  return newDeliverable
}

/**
 * Delete a deliverable
 */
export async function deleteDeliverable(deliverableId: string): Promise<boolean> {
  const result = await db
    .delete(dashboardDeliverables)
    .where(eq(dashboardDeliverables.id, deliverableId))
  return (result.rowCount ?? 0) > 0
}

// ── Note Queries ────────────────────────────────────────────────

/**
 * Get all active notes for a user (not completed)
 */
export async function getNotes(userId: string): Promise<DashboardNote[]> {
  return db
    .select()
    .from(dashboardNotes)
    .where(and(
      eq(dashboardNotes.userId, userId),
      sql`${dashboardNotes.completed} IS NULL`
    ))
    .orderBy(desc(dashboardNotes.createdAt))
}

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  content: string
): Promise<DashboardNote> {
  const [newNote] = await db
    .insert(dashboardNotes)
    .values({ userId, content })
    .returning()
  return newNote
}

/**
 * Mark note as completed
 */
export async function completeNote(noteId: string): Promise<boolean> {
  const [updated] = await db
    .update(dashboardNotes)
    .set({ completed: new Date() })
    .where(eq(dashboardNotes.id, noteId))
    .returning()
  return !!updated
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<boolean> {
  const result = await db
    .delete(dashboardNotes)
    .where(eq(dashboardNotes.id, noteId))
  return (result.rowCount ?? 0) > 0
}

// ── Action Log Queries ──────────────────────────────────────────

/**
 * Get recent action log entries (last 50)
 */
export async function getActionLog(userId: string, limit = 50): Promise<DashboardActionLogEntry[]> {
  return db
    .select()
    .from(dashboardActionLog)
    .where(eq(dashboardActionLog.userId, userId))
    .orderBy(desc(dashboardActionLog.createdAt))
    .limit(limit)
}

/**
 * Add action log entry
 */
export async function addActionLogEntry(
  userId: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<DashboardActionLogEntry> {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const [newEntry] = await db
    .insert(dashboardActionLog)
    .values({ userId, timestamp, message, metadata })
    .returning()
  return newEntry
}

/**
 * Clean up expired action log entries (for cron job)
 */
export async function cleanupExpiredActionLogs(): Promise<number> {
  const result = await db
    .delete(dashboardActionLog)
    .where(sql`${dashboardActionLog.expiresAt} < now()`)
  return result.rowCount ?? 0
}
