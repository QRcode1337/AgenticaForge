/**
 * TypeScript types for ErisMorn Dashboard API
 * Shared between server and client
 */

export type TaskStatus = 'todo' | 'progress' | 'done' | 'archived'

export interface Task {
  id: string
  userId: string
  title: string
  date: string
  status: TaskStatus
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface Deliverable {
  id: string
  userId: string
  title: string
  date: string
  icon: string
  type: string
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  userId: string
  content: string
  completed: Date | null
  createdAt: Date
}

export interface ActionLogEntry {
  id: string
  userId: string
  timestamp: string
  message: string
  metadata?: Record<string, unknown>
  expiresAt: Date | null
  createdAt: Date
}

// ── API Request/Response Types ──────────────────────────────────

export interface CreateTaskRequest {
  title: string
  date: string
  status?: TaskStatus
  position?: number
}

export interface UpdateTaskRequest {
  title?: string
  date?: string
  status?: TaskStatus
  position?: number
}

export interface ReorderTasksRequest {
  tasks: Array<{ id: string; position: number }>
}

export interface CreateDeliverableRequest {
  title: string
  date: string
  icon: string
  type: string
}

export interface CreateNoteRequest {
  content: string
}

export interface AddActionLogRequest {
  message: string
  metadata?: Record<string, unknown>
}

// ── API Response Wrappers ───────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    message: string
    code?: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
