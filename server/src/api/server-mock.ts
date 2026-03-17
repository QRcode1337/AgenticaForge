import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dashboardRoutes from './routes/dashboard-mock.js'

const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ──────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'mock',
    message: 'Using in-memory mock database'
  })
})

app.use('/api/dashboard', dashboardRoutes)

// ── Error Handling ──────────────────────────────────────────────

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
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
  console.log(`⚠️  MODE: MOCK DATABASE (in-memory only)`)
})

export default app
