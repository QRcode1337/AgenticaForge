# AgenticaForge Dashboard API

Backend persistence layer for the AgenticaForge Dashboard, integrated with the shared Supabase/Drizzle stack.

## Architecture

### Database Schema

Located in `schema.ts`, defines 4 main tables for the dashboard logic:

1. **dashboard_tasks** - Kanban board tasks with drag-and-drop ordering.
2. **dashboard_deliverables** - Completed work artifacts from agentic swarms.
3. **dashboard_notes** - Quick notes and reminders for the operator.
4. **dashboard_action_log** - Activity timeline and telemetry history.

### Query Functions

All database operations are in `queries.ts`:

**Tasks:**
- `getTasks(userId)` - Fetch all Kanban tasks.
- `createTask(userId, task)` - Add a new task card.
- `updateTask(taskId, updates)` - Update status or content.
- `deleteTask(taskId)` - Remove task.
- `reorderTasks(userId, taskUpdates)` - Bulk position sync for drag-and-drop.

**Deliverables:**
- `getDeliverables(userId)` - List all swarm artifacts.
- `createDeliverable(userId, deliverable)` - Persist a new completion artifact.

**Action Log:**
- `getActionLog(userId, limit)` - Fetch recent activity.
- `addActionLogEntry(userId, message, metadata)` - Stream new events to the log.

## Usage

### From Backend (Node.js)

```typescript
import * as dashboard from './dashboard'

// Fetch tasks for the current user
const tasks = await dashboard.getTasks(userId)
```

### From Frontend (Vite)

The dashboard frontend (in the root `src/`) interacts with these through the Express server at `:3001`.

## Database Management

To update the schema or push changes using Drizzle Kit:

```bash
# From the root directory
npm run dev:all # ensures everything is running

# Specific DB commands in the server directory
cd server
npm run db:generate
npm run db:push
```

## Integration with AgenticaForge

This module extensions the core infrastructure:
- **Shared DB**: Uses the same Postgres/Supabase instance as `memories` and `agents`.
- **Isolated Tables**: Prefixed with `dashboard_` to maintain clean separation from core swarm logic.
- **Unified Logic**: Swarm completions automatically trigger `createDeliverable` to notify the UI.
