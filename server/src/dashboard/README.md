# ErisMorn Dashboard API

Backend persistence layer for the ErisMorn Dashboard, integrated with AgentForge's Supabase/Drizzle stack.

## Architecture

### Database Schema

Located in `schema.ts`, defines 4 new tables:

1. **dashboard_tasks** - Kanban board tasks with drag-and-drop ordering
2. **dashboard_deliverables** - Completed work artifacts
3. **dashboard_notes** - Quick notes and reminders
4. **dashboard_action_log** - Activity timeline (auto-expires after 30 days)

### Query Functions

All database operations are in `queries.ts`:

**Tasks:**
- `getTasks(userId)` - Get all tasks for user
- `createTask(userId, task)` - Create new task
- `updateTask(taskId, updates)` - Update task properties
- `deleteTask(taskId)` - Delete task
- `reorderTasks(userId, taskUpdates)` - Batch update positions for drag-and-drop

**Deliverables:**
- `getDeliverables(userId)` - Get all deliverables
- `createDeliverable(userId, deliverable)` - Create new deliverable
- `deleteDeliverable(deliverableId)` - Delete deliverable

**Notes:**
- `getNotes(userId)` - Get active (non-completed) notes
- `createNote(userId, content)` - Create new note
- `completeNote(noteId)` - Mark note as completed
- `deleteNote(noteId)` - Delete note

**Action Log:**
- `getActionLog(userId, limit)` - Get recent log entries
- `addActionLogEntry(userId, message, metadata)` - Add log entry
- `cleanupExpiredActionLogs()` - Remove expired entries (for cron)

## Usage

### From Backend (Node.js)

```typescript
import * as dashboard from './dashboard'

// Get all tasks
const tasks = await dashboard.getTasks(userId)

// Create task
const newTask = await dashboard.createTask(userId, {
  title: 'Build API',
  date: 'Feb 12, 2026',
  status: 'progress',
  position: 0,
})

// Update task status
await dashboard.updateTask(newTask.id, { status: 'done' })
```

### From Frontend (React)

Use the client API wrapper in `/Users/patrickgallowaypro/Documents/PROJECTS/ErisMorn-Dashboard/src/lib/api.ts`:

```typescript
import { api } from '@/lib/api'

// Get all tasks
const tasks = await api.tasks.getAll()

// Create task
const newTask = await api.tasks.create({
  title: 'Build API',
  date: 'Feb 12, 2026',
  status: 'progress',
})

// Update via drag-and-drop
await api.tasks.update(taskId, { status: 'done' })
```

## Migration

To apply the schema to your database:

```bash
cd /Users/patrickgallowaypro/Documents/PROJECTS/AgentForge/server

# Generate migration
npm run db:generate

# Apply migration
npm run db:push
```

## Next Steps

1. **API Server** - Create HTTP endpoints (Express/Fastify) or use these functions directly in Supabase Edge Functions
2. **Authentication** - Replace hardcoded userId with real user auth
3. **Real-time** - Add Supabase Realtime subscriptions for live updates
4. **Validation** - Add input validation with Zod or similar
5. **Rate Limiting** - Protect API endpoints from abuse

## Integration with AgentForge

This module extends AgentForge's existing backend infrastructure:

- **Reuses**: Drizzle ORM, Postgres connection, schema patterns
- **Isolated**: Separate namespace (`dashboard_*` tables) to avoid conflicts
- **Consistent**: Follows same patterns as `memories`, `agents`, etc.

The dashboard queries can be used alongside AgentForge's swarm operations without interference.
