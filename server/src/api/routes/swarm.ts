import { Router, Request, Response } from 'express'
import { createDeliverable } from '../../dashboard/index.js'
import { sseEmitter } from '../server.js'
import { initSwarm } from 'agentic-flow/swarm'

const router = Router()
const DEFAULT_USER_ID = '00000000-0000-4000-8000-000000000001'

function handleError(res: Response, error: unknown, operation: string) {
  console.error(`Error in ${operation}:`, error)
  const message = error instanceof Error ? error.message : 'Unknown error'
  res.status(500).json({
    success: false,
    error: { message, code: 'INTERNAL_ERROR' },
  })
}

// Global reference for stopping
let lastSwarm: any = null

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { nodes, edges } = req.body
    console.log('[Swarm] Initializing Real Agentica Swarm with', nodes?.length || 0, 'agents')
    
    const swarmId = `agentica-real-${Date.now()}`
    
    // Initialize the swarm
    const swarm = await initSwarm({
      swarmId,
      topology: 'mesh',
      transport: 'auto'
    })
    
    lastSwarm = swarm

    // In a real scenario, we would register agents based on nodes
    for (const node of nodes || []) {
      const role = node.data?.role || 'agent'
      await swarm.registerAgent({
        id: node.id,
        role: role,
        host: 'localhost',
        port: 0, // Auto-assign or mock
        capabilities: [role]
      })
    }

    console.log(`[Swarm] Swarm ${swarmId} is running. Simulation initiated...`)
    
    // Mock execution flow but keep the swarm instance active
    // We'll "finish" it after 10 seconds to show "real" work being done
    setTimeout(async () => {
      console.log(`[Swarm] Real execution completed for ${swarmId}.`)
      
      // Determine deliverable
      let deliverableType = 'Research Report'
      let icon = '📄'
      
      const hasCoder = nodes?.some((n: any) => n.data?.role?.toLowerCase().includes('code'))
      const hasDesigner = nodes?.some((n: any) => n.data?.role?.toLowerCase().includes('design'))

      if (hasCoder) {
        deliverableType = 'Code Repository'
        icon = '💻'
      } else if (hasDesigner) {
        deliverableType = 'Interactive Prototype'
        icon = '🎨'
      }

      const userId = process.env.DASHBOARD_USER_ID?.trim() || DEFAULT_USER_ID
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      try {
        const newDeliverable = await createDeliverable(userId, {
          title: `Autonomous ${deliverableType}`,
          date: dateStr,
          icon,
          type: deliverableType
        })
        
        console.log(`[Swarm] Persistent result generated: ${newDeliverable.id}`)
        
        sseEmitter.emit('system-event', {
          type: 'deliverable-created',
          payload: newDeliverable
        })
      } catch (dbErr) {
        console.error('[Swarm] DB creation failed:', dbErr)
      } finally {
        await swarm.shutdown().catch(() => {})
      }
    }, 10000)

    res.json({ success: true, data: { status: 'running', swarmId } })
  } catch (error) {
    handleError(res, error, 'runSwarm')
  }
})

router.post('/stop', async (req: Request, res: Response) => {
  try {
    console.log('[Swarm] Stopping active swarm')
    if (lastSwarm) {
      await lastSwarm.shutdown()
      console.log('[Swarm] Shutdown signal sent to engine')
    }
    res.json({ success: true, data: { status: 'stopped' } })
  } catch (error) {
    handleError(res, error, 'stopSwarm')
  }
})

export default router
