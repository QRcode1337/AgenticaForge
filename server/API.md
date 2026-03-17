# AgentForge API Server

REST API server for AgentForge and ErisMorn Dashboard.

## Quick Start

```bash
# Install dependencies
npm install

# Generate and push database migrations
npm run db:generate
npm run db:push

# Start development server (with hot reload)
npm run dev

# Start production server
npm start
```

Server runs on `http://localhost:3000` by default.

## Environment Variables

Required in `.env`:

```bash
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
PORT=3000                                    # Optional, defaults to 3000
CORS_ORIGIN=http://localhost:5173           # Optional, defaults to this
```

## API Endpoints

### Health Check

**GET /health**
- Returns server status
- Response: `{ status: "ok", timestamp: "..." }`

### Dashboard API

All dashboard endpoints are under `/api/dashboard`

#### Tasks

**GET /api/dashboard/tasks**
- Get all tasks for user
- Response: `{ success: true, data: Task[] }`

**POST /api/dashboard/tasks**
- Create new task
- Body: `{ title: string, date: string, status?: string, position?: number }`
- Response: `{ success: true, data: Task }`

**PATCH /api/dashboard/tasks/:id**
- Update task
- Body: `{ title?, date?, status?, position? }`
- Response: `{ success: true, data: Task }`

**DELETE /api/dashboard/tasks/:id**
- Delete task
- Response: `{ success: true, data: null }`

**POST /api/dashboard/tasks/reorder**
- Reorder tasks (drag-and-drop)
- Body: `{ tasks: Array<{ id: string, position: number }> }`
- Response: `{ success: true, data: null }`

#### Deliverables

**GET /api/dashboard/deliverables**
- Get all deliverables
- Response: `{ success: true, data: Deliverable[] }`

**POST /api/dashboard/deliverables**
- Create deliverable
- Body: `{ title: string, date: string, icon: string, type: string }`
- Response: `{ success: true, data: Deliverable }`

**DELETE /api/dashboard/deliverables/:id**
- Delete deliverable
- Response: `{ success: true, data: null }`

#### Notes

**GET /api/dashboard/notes**
- Get active notes (not completed)
- Response: `{ success: true, data: Note[] }`

**POST /api/dashboard/notes**
- Create note
- Body: `{ content: string }`
- Response: `{ success: true, data: Note }`

**POST /api/dashboard/notes/:id/complete**
- Mark note as completed
- Response: `{ success: true, data: null }`

**DELETE /api/dashboard/notes/:id**
- Delete note
- Response: `{ success: true, data: null }`

#### Action Log

**GET /api/dashboard/action-log**
- Get recent action log entries
- Query params: `limit` (default: 50)
- Response: `{ success: true, data: ActionLogEntry[] }`

**POST /api/dashboard/action-log**
- Add action log entry
- Body: `{ message: string, metadata?: Record<string, unknown> }`
- Response: `{ success: true, data: ActionLogEntry }`

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

Error codes:
- `VALIDATION_ERROR` - Invalid request body (400)
- `NOT_FOUND` - Resource not found (404)
- `INTERNAL_ERROR` - Server error (500)

## TypeScript Types

Import shared types from the dashboard module:

```typescript
import type {
  Task,
  Deliverable,
  Note,
  ActionLogEntry,
  TaskStatus,
} from './src/dashboard/types'
```

## Architecture

- **Express** - Web framework
- **Drizzle ORM** - Database queries
- **Postgres** - Database via Supabase
- **CORS** - Cross-origin support for frontend

### Project Structure

```
server/
├── src/
│   ├── api/
│   │   ├── server.ts           # Express app and middleware
│   │   └── routes/
│   │       └── dashboard.ts    # Dashboard API routes
│   └── dashboard/
│       ├── schema.ts            # Database schema
│       ├── queries.ts           # Database queries
│       ├── types.ts             # TypeScript types
│       └── index.ts             # Module exports
├── db/
│   ├── schema.ts                # Full Drizzle schema
│   ├── index.ts                 # Database connection
│   └── migrations/              # SQL migrations
└── package.json
```

## Development Workflow

1. **Make schema changes** in `db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Apply migration**: `npm run db:push`
4. **Test locally** with `npm run dev`
5. **Deploy** with `npm start`

## Database Migrations

Migrations are in `db/migrations/` and use Drizzle Kit:

```bash
# Generate new migration from schema changes
npm run db:generate

# Push migration to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Security Notes

- **User ID**: Currently hardcoded as `'erismorn-user'` for single-user dashboard
- **CORS**: Configured for local development, update for production
- **Validation**: Basic validation on required fields
- **Error Handling**: Logs errors server-side, returns safe messages to client

## Next Steps

- [ ] Add authentication and user management
- [ ] Add rate limiting
- [ ] Add request validation with Zod
- [ ] Add real-time updates with WebSockets or Supabase Realtime
- [ ] Add API documentation with Swagger/OpenAPI
- [ ] Add monitoring and logging
- [ ] Add tests (Jest/Vitest)
