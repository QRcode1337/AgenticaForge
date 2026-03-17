/**
 * Mock implementation of dashboard queries for testing without database
 * Replace with real queries once database connection is established
 */

import type {
  DashboardTask,
  NewDashboardTask,
  DashboardDeliverable,
  NewDashboardDeliverable,
  DashboardNote,
  NewDashboardNote,
  DashboardActionLogEntry,
  NewDashboardActionLogEntry,
} from './schema.js'

// In-memory storage
const mockTasks: DashboardTask[] = []
const mockDeliverables: DashboardDeliverable[] = []
const mockNotes: DashboardNote[] = []
const mockActionLog: DashboardActionLogEntry[] = []

// Helper to generate UUID
const generateId = () => Math.random().toString(36).substring(7)

// ── Task Queries ────────────────────────────────────────────────

export async function getTasks(userId: string): Promise<DashboardTask[]> {
  return mockTasks.filter(t => t.userId === userId)
}

export async function createTask(
  userId: string,
  task: Omit<NewDashboardTask, 'userId' | 'id' | 'createdAt' | 'updatedAt'>
): Promise<DashboardTask> {
  const newTask: DashboardTask = {
    id: generateId(),
    userId,
    title: task.title,
    date: task.date,
    status: task.status || 'todo',
    position: task.position || mockTasks.length,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  mockTasks.push(newTask)
  return newTask
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<DashboardTask, 'title' | 'date' | 'status' | 'position'>>
): Promise<DashboardTask | null> {
  const task = mockTasks.find(t => t.id === taskId)
  if (!task) return null

  Object.assign(task, updates, { updatedAt: new Date() })
  return task
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const index = mockTasks.findIndex(t => t.id === taskId)
  if (index === -1) return false

  mockTasks.splice(index, 1)
  return true
}

export async function reorderTasks(
  userId: string,
  taskUpdates: { id: string; position: number }[]
): Promise<void> {
  for (const update of taskUpdates) {
    const task = mockTasks.find(t => t.id === update.id && t.userId === userId)
    if (task) {
      task.position = update.position
      task.updatedAt = new Date()
    }
  }
}

// ── Deliverable Queries ─────────────────────────────────────────

export async function getDeliverables(userId: string): Promise<DashboardDeliverable[]> {
  return mockDeliverables.filter(d => d.userId === userId)
}

export async function createDeliverable(
  userId: string,
  deliverable: Omit<NewDashboardDeliverable, 'userId' | 'id' | 'createdAt' | 'updatedAt'>
): Promise<DashboardDeliverable> {
  const newDeliverable: DashboardDeliverable = {
    id: generateId(),
    userId,
    ...deliverable,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  mockDeliverables.push(newDeliverable)
  return newDeliverable
}

export async function deleteDeliverable(deliverableId: string): Promise<boolean> {
  const index = mockDeliverables.findIndex(d => d.id === deliverableId)
  if (index === -1) return false

  mockDeliverables.splice(index, 1)
  return true
}

// ── Note Queries ────────────────────────────────────────────────

export async function getNotes(userId: string): Promise<DashboardNote[]> {
  return mockNotes.filter(n => n.userId === userId && !n.completed)
}

export async function createNote(
  userId: string,
  content: string
): Promise<DashboardNote> {
  const newNote: DashboardNote = {
    id: generateId(),
    userId,
    content,
    completed: null,
    createdAt: new Date(),
  }
  mockNotes.push(newNote)
  return newNote
}

export async function completeNote(noteId: string): Promise<boolean> {
  const note = mockNotes.find(n => n.id === noteId)
  if (!note) return false

  note.completed = new Date()
  return true
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const index = mockNotes.findIndex(n => n.id === noteId)
  if (index === -1) return false

  mockNotes.splice(index, 1)
  return true
}

// ── Action Log Queries ──────────────────────────────────────────

export async function getActionLog(userId: string, limit = 50): Promise<DashboardActionLogEntry[]> {
  return mockActionLog
    .filter(a => a.userId === userId)
    .slice(0, limit)
}

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

  const newEntry: DashboardActionLogEntry = {
    id: generateId(),
    userId,
    timestamp,
    message,
    metadata: metadata || null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date(),
  }
  mockActionLog.unshift(newEntry) // Add to beginning
  return newEntry
}

export async function cleanupExpiredActionLogs(): Promise<number> {
  const now = Date.now()
  const before = mockActionLog.length
  const filtered = mockActionLog.filter(a => a.expiresAt && a.expiresAt.getTime() > now)
  mockActionLog.length = 0
  mockActionLog.push(...filtered)
  return before - mockActionLog.length
}
