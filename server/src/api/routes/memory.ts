import { Router, Request, Response } from 'express'
import { AgentDB } from 'agentdb'

const router = Router()

// Initialize AgentDB
let db: AgentDB | null = null
let reasoningBank: any = null

async function initDB() {
  try {
    db = new AgentDB({ dbPath: ':memory:' })
    await db.initialize()
    reasoningBank = db.getController('reasoning')
    console.log('[AgentDB] Initialized with ReasoningBank')
  } catch (err) {
    console.error('[AgentDB] Initialization error:', err)
  }
}
initDB()

function handleError(res: Response, error: unknown, operation: string) {
  console.error(`Error in ${operation}:`, error)
  const message = error instanceof Error ? error.message : 'Unknown error'
  res.status(500).json({
    success: false,
    error: { message, code: 'INTERNAL_ERROR' },
  })
}

router.post('/store', async (req: Request, res: Response) => {
  try {
    if (!reasoningBank) throw new Error('ReasoningBank not initialized')
    const { task, success, reward, output } = req.body
    
    // Map AgentForge payload to AgentDB ReasoningPattern
    const pattern = {
      taskType: task || 'general',
      approach: output || 'default',
      successRate: reward || 1.0
    }
    
    const id = await reasoningBank.storePattern(pattern)
    res.json({ success: true, data: { id } })
  } catch (error) {
    handleError(res, error, 'storePattern')
  }
})

router.post('/search', async (req: Request, res: Response) => {
  try {
    if (!reasoningBank) throw new Error('ReasoningBank not initialized')
    const { query, options } = req.body
    const patterns = await reasoningBank.searchPatterns({
      task: query,
      k: options?.k || 10
    })
    
    // Map back to expected output format
    const mapped = patterns.map((p: any) => ({
      id: p.id,
      task: p.taskType,
      content: p.approach,
      reward: p.successRate,
      similarity: p.similarity
    }))
    
    res.json({ success: true, data: mapped })
  } catch (error) {
    handleError(res, error, 'retrievePatterns')
  }
})

export default router
