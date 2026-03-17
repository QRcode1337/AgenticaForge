import { Router, Request, Response } from 'express'
import * as dashboard from '../../dashboard/mock-queries.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DEFAULT_DASHBOARD_USER_ID = '00000000-0000-4000-8000-000000000001'

function getDashboardUserId(): string {
  const fromEnv = process.env.DASHBOARD_USER_ID?.trim()
  if (fromEnv && UUID_RE.test(fromEnv)) return fromEnv
  return DEFAULT_DASHBOARD_USER_ID
}

// ── Helper Functions ────────────────────────────────────────────

function handleError(res: Response, error: unknown, operation: string) {
  console.error(`Error in ${operation}:`, error)
  const message = error instanceof Error ? error.message : 'Unknown error'
  res.status(500).json({
    success: false,
    error: { message, code: 'INTERNAL_ERROR' },
  })
}

// ── Task Routes ─────────────────────────────────────────────────

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const tasks = await dashboard.getTasks(getDashboardUserId())
    res.json({ success: true, data: tasks })
  } catch (error) {
    handleError(res, error, 'getTasks')
  }
})

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { title, date, status, position } = req.body
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'title and date are required', code: 'VALIDATION_ERROR' },
      })
    }
    const task = await dashboard.createTask(getDashboardUserId(), {
      title,
      date,
      status: status || 'todo',
      position: position || 0,
    })
    res.json({ success: true, data: task })
  } catch (error) {
    handleError(res, error, 'createTask')
  }
})

router.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body
    const task = await dashboard.updateTask(id, updates)
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'NOT_FOUND' },
      })
    }
    res.json({ success: true, data: task })
  } catch (error) {
    handleError(res, error, 'updateTask')
  }
})

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await dashboard.deleteTask(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'NOT_FOUND' },
      })
    }
    res.json({ success: true, data: null })
  } catch (error) {
    handleError(res, error, 'deleteTask')
  }
})

router.post('/tasks/reorder', async (req: Request, res: Response) => {
  try {
    const { tasks } = req.body
    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: { message: 'tasks must be an array', code: 'VALIDATION_ERROR' },
      })
    }
    await dashboard.reorderTasks(getDashboardUserId(), tasks)
    res.json({ success: true, data: null })
  } catch (error) {
    handleError(res, error, 'reorderTasks')
  }
})

// ── Deliverable Routes ──────────────────────────────────────────

router.get('/deliverables', async (req: Request, res: Response) => {
  try {
    const deliverables = await dashboard.getDeliverables(getDashboardUserId())
    res.json({ success: true, data: deliverables })
  } catch (error) {
    handleError(res, error, 'getDeliverables')
  }
})

router.post('/deliverables', async (req: Request, res: Response) => {
  try {
    const { title, date, icon, type } = req.body
    if (!title || !date || !icon || !type) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'title, date, icon, and type are required',
          code: 'VALIDATION_ERROR',
        },
      })
    }
    const deliverable = await dashboard.createDeliverable(getDashboardUserId(), {
      title,
      date,
      icon,
      type,
    })
    res.json({ success: true, data: deliverable })
  } catch (error) {
    handleError(res, error, 'createDeliverable')
  }
})

router.delete('/deliverables/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await dashboard.deleteDeliverable(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Deliverable not found', code: 'NOT_FOUND' },
      })
    }
    res.json({ success: true, data: null })
  } catch (error) {
    handleError(res, error, 'deleteDeliverable')
  }
})

// ── Note Routes ─────────────────────────────────────────────────

router.get('/notes', async (req: Request, res: Response) => {
  try {
    const notes = await dashboard.getNotes(getDashboardUserId())
    res.json({ success: true, data: notes })
  } catch (error) {
    handleError(res, error, 'getNotes')
  }
})

router.post('/notes', async (req: Request, res: Response) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'content is required', code: 'VALIDATION_ERROR' },
      })
    }
    const note = await dashboard.createNote(getDashboardUserId(), content)
    res.json({ success: true, data: note })
  } catch (error) {
    handleError(res, error, 'createNote')
  }
})

router.post('/notes/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const completed = await dashboard.completeNote(id)
    if (!completed) {
      return res.status(404).json({
        success: false,
        error: { message: 'Note not found', code: 'NOT_FOUND' },
      })
    }
    res.json({ success: true, data: null })
  } catch (error) {
    handleError(res, error, 'completeNote')
  }
})

router.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await dashboard.deleteNote(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Note not found', code: 'NOT_FOUND' },
      })
    }
    res.json({ success: true, data: null })
  } catch (error) {
    handleError(res, error, 'deleteNote')
  }
})

// ── Action Log Routes ───────────────────────────────────────────

router.get('/action-log', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const entries = await dashboard.getActionLog(getDashboardUserId(), limit)
    res.json({ success: true, data: entries })
  } catch (error) {
    handleError(res, error, 'getActionLog')
  }
})

router.post('/action-log', async (req: Request, res: Response) => {
  try {
    const { message, metadata } = req.body
    if (!message) {
      return res.status(400).json({
        success: false,
        error: { message: 'message is required', code: 'VALIDATION_ERROR' },
      })
    }
    const entry = await dashboard.addActionLogEntry(getDashboardUserId(), message, metadata)
    res.json({ success: true, data: entry })
  } catch (error) {
    handleError(res, error, 'addActionLogEntry')
  }
})

export default router
