/**
 * ErisMorn Dashboard API Module
 * Exports all database queries and types for dashboard functionality
 */

// Schema and types
export * from './schema.js'
export * from './types.js'

// Database queries
export {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getDeliverables,
  createDeliverable,
  deleteDeliverable,
  getNotes,
  createNote,
  completeNote,
  deleteNote,
  getActionLog,
  addActionLogEntry,
  cleanupExpiredActionLogs,
} from './queries.js'
