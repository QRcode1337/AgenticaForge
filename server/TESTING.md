# Backend API Testing Guide

## Quick Start

### Option 1: Test with Real Database (Recommended)

```bash
# 1. Navigate to server directory
cd /Users/patrickgallowaypro/Documents/PROJECTS/AgentForge/server

# 2. Ensure environment variables are set
cat .env | grep DATABASE_URL

# 3. Apply database migrations
npm run db:push

# 4. Start the server
npm run dev

# Server should start on http://localhost:3000
```

### Option 2: Test with Mock Database (No DB Required)

```bash
# 1. Navigate to server directory
cd /Users/patrickgallowaypro/Documents/PROJECTS/AgentForge/server

# 2. Start mock server
npx tsx src/api/server-mock.ts

# Server starts with in-memory storage on http://localhost:3000
```

## Testing the API

### Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T...",
  "mode": "mock"  // if using mock server
}
```

### Test Tasks Endpoints

**Get all tasks:**
```bash
curl http://localhost:3000/api/dashboard/tasks
```

**Create a task:**
```bash
curl -X POST http://localhost:3000/api/dashboard/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "date": "Feb 12, 2026",
    "status": "todo"
  }'
```

**Update task status:**
```bash
# Replace TASK_ID with the id from create response
curl -X PATCH http://localhost:3000/api/dashboard/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

**Delete a task:**
```bash
curl -X DELETE http://localhost:3000/api/dashboard/tasks/TASK_ID
```

**Reorder tasks (drag-and-drop):**
```bash
curl -X POST http://localhost:3000/api/dashboard/tasks/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id": "task-1", "position": 0},
      {"id": "task-2", "position": 1}
    ]
  }'
```

### Test Deliverables Endpoints

**Get deliverables:**
```bash
curl http://localhost:3000/api/dashboard/deliverables
```

**Create deliverable:**
```bash
curl -X POST http://localhost:3000/api/dashboard/deliverables \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Deliverable",
    "date": "Feb 12, 2026",
    "icon": "🚀",
    "type": "Code"
  }'
```

### Test Notes Endpoints

**Get notes:**
```bash
curl http://localhost:3000/api/dashboard/notes
```

**Create note:**
```bash
curl -X POST http://localhost:3000/api/dashboard/notes \
  -H "Content-Type: application/json" \
  -d '{"content": "Test note"}'
```

**Complete note:**
```bash
curl -X POST http://localhost:3000/api/dashboard/notes/NOTE_ID/complete
```

### Test Action Log Endpoints

**Get action log:**
```bash
curl http://localhost:3000/api/dashboard/action-log?limit=10
```

**Add action log entry:**
```bash
curl -X POST http://localhost:3000/api/dashboard/action-log \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test action",
    "metadata": {"source": "manual_test"}
  }'
```

## Frontend Integration

### Connect Dashboard to API

Update `/Users/patrickgallowaypro/Documents/PROJECTS/ErisMorn-Dashboard/src/components/Dashboard.tsx`:

```typescript
import { api } from '../lib/api'
import { useEffect, useState } from 'react'

// Replace hardcoded initialTasks with:
const [tasks, setTasks] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  api.tasks.getAll()
    .then(setTasks)
    .catch(setError)
    .finally(() => setLoading(false))
}, [])

// Use api.tasks.create(), api.tasks.update(), etc.
```

### Configure API URL

Create `/Users/patrickgallowaypro/Documents/PROJECTS/ErisMorn-Dashboard/.env`:

```bash
# Use real API
VITE_API_URL=http://localhost:3000/api

# OR use mock mode (no backend needed)
VITE_USE_MOCK_API=true
```

## Troubleshooting

### Server Won't Start

**Check port availability:**
```bash
lsof -i :3000
# If something is using port 3000, kill it:
kill -9 <PID>
```

**Check for TypeScript errors:**
```bash
npx tsc --noEmit
```

### Database Connection Issues

**Verify environment variables:**
```bash
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

**Test database connection:**
```bash
psql "$DATABASE_URL" -c "SELECT NOW();"
```

**Check Supabase project status:**
- Visit https://supabase.com/dashboard
- Verify project is active
- Check database credentials

### CORS Issues

If frontend can't connect to API:

**Update server CORS settings** in `src/api/server.ts`:
```typescript
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite dev server
  credentials: true,
}))
```

## Success Criteria

✅ Health endpoint returns `{"status": "ok"}`
✅ Can create, read, update, delete tasks
✅ Can reorder tasks via drag-and-drop
✅ Can create deliverables
✅ Can create and complete notes
✅ Can add action log entries
✅ Frontend loads data from API
✅ Changes persist across page refreshes

## Next Steps

Once API is verified working:
1. Update Dashboard.tsx to use API instead of hardcoded data
2. Add loading states and error handling
3. Test full CRUD operations from UI
4. Verify drag-and-drop persists to database
5. Verify notes create tasks in database

## Support

All backend code is in:
- `/Users/patrickgallowaypro/Documents/PROJECTS/AgentForge/server/src/api/` - Server and routes
- `/Users/patrickgallowaypro/Documents/PROJECTS/AgentForge/server/src/dashboard/` - Database queries
- `/Users/patrickgallowaypro/Documents/PROJECTS/ErisMorn-Dashboard/src/lib/api.ts` - Frontend client

Documentation:
- `/Users/patrickgallowaypro/Documents/PROJECTS/AgentForge/server/API.md` - Complete API reference
- `/Users/patrickgallowaypro/Documents/PROJECTS/ErisMorn-Dashboard/BACKEND_IMPLEMENTATION.md` - Implementation summary
