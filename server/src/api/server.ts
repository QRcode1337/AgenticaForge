import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dashboardRoutes from './routes/dashboard.js'
import memoryRoutes from './routes/memory.js'
import swarmRoutes from './routes/swarm.js'
import { mapApiError } from './error-utils.js'

const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ──────────────────────────────────────────────────

app.use(cors({
  origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// ── Routes ──────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/health/keys', (req, res) => {
  const required = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }
  const providers = {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
  }

  const missingRequired = Object.entries(required)
    .filter(([, isSet]) => !isSet)
    .map(([name]) => name)

  res.json({
    status: missingRequired.length === 0 ? 'ok' : 'degraded',
    missingRequired,
    configured: { ...required, ...providers },
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/dashboard', dashboardRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/swarm', swarmRoutes)

import { EventEmitter } from 'events'
export const sseEmitter = new EventEmitter()

// ── Telemetry (SSE) ──────────────────────────────────────────────
app.get('/api/telemetry', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  // Send mock SONA telemetry roughly based on Agentica metrics
  const interval = setInterval(() => {
    const data = {
      type: 'sona-telemetry',
      payload: {
        epoch: Date.now(),
        reward: 0.7 + (Math.random() * 0.2), // SONA avg reward
        loss: 0.1 + (Math.random() * 0.05), // SONA loss
        patternCount: Math.floor(Math.random() * 50) + 100
      }
    }
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }, 2000)
  
  // Forward general system events
  const onSystemEvent = (eventData: any) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`)
  }
  sseEmitter.on('system-event', onSystemEvent)

  req.on('close', () => {
    clearInterval(interval)
    sseEmitter.off('system-event', onSystemEvent)
  })
})

// ── Error Handling ──────────────────────────────────────────────

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err)
  const mapped = mapApiError(err)
  res.status(mapped.status).json({
    success: false,
    error: {
      message: mapped.message,
      code: mapped.code,
      retryAt: mapped.retryAt,
    },
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  })
})

// ── Server Start ────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 AgentForge API server running on http://localhost:${PORT}`)
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`)
  console.log(`❤️  Health check: http://localhost:${PORT}/health`)
})

export default app
