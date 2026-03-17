import express from 'express'

const app = express()
const PORT = 3000

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`)
  console.log(`Test: curl http://localhost:${PORT}/health`)
})
