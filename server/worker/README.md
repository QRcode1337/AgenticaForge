# AgentForge Embedding Worker

Background worker that generates OpenAI embeddings for pending memories, enabling semantic search.

## Architecture

```
Memory Store (via Edge Function)
    ↓
Database: embedding_status = 'pending'
    ↓
Worker polls every 5s
    ↓
OpenAI API: Generate 1536-dim vector
    ↓
Database: Update embedding + status = 'ready'
```

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Ensure `.env` has:

```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### 3. Run Worker

```bash
npx tsx server/worker/src/embedding-worker.ts
```

Output:
```
🚀 Embedding Worker Started
   Model: text-embedding-3-small
   Batch Size: 10
   Poll Interval: 5000ms

[2026-02-12T12:00:00.000Z] Processing 5 pending memories...
  ✅ a1b2c3d4... [research] - Embedded successfully
  ✅ e5f6g7h8... [research] - Embedded successfully
  Results: 5 succeeded, 0 failed
```

## Testing

### Create Test Memories

```bash
npx tsx server/test-worker.ts create
```

### Check Status

```bash
npx tsx server/worker-status.ts
```

### Verify Embeddings

```bash
npx tsx server/test-worker.ts check
```

### Cleanup

```bash
npx tsx server/test-worker.ts cleanup
```

## Configuration

Edit `embedding-worker.ts`:

```typescript
const POLL_INTERVAL_MS = 5000  // Poll frequency
const BATCH_SIZE = 10          // Memories per batch
const MAX_RETRIES = 3          // Retry attempts
const EMBEDDING_MODEL = 'text-embedding-3-small' // OpenAI model
```

## Production Deployment

### Option 1: PM2 (Recommended)

```bash
npm install -g pm2
pm2 start "npx tsx server/worker/src/embedding-worker.ts" --name agentforge-worker
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ ./
CMD ["npx", "tsx", "worker/src/embedding-worker.ts"]
```

### Option 3: Systemd Service

```ini
[Unit]
Description=AgentForge Embedding Worker
After=network.target

[Service]
Type=simple
User=agentforge
WorkingDirectory=/opt/agentforge/server
ExecStart=/usr/bin/npx tsx worker/src/embedding-worker.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Worker Status

```bash
npx tsx server/worker-status.ts
```

Output:
```
=== Embedding Worker Status ===

Status Breakdown:
  pending         3  ███
  ready         142  ██████████████████████████████████████████████████
  failed          0

By Namespace:
  research         87 total  (100% ready, 0 pending, 0 failed)
  analysis         42 total  (100% ready, 0 pending, 0 failed)
  reports          13 total  (92% ready, 1 pending, 0 failed)
```

### Health Check

Add to your monitoring:

```typescript
import { getWorkerStatus } from './worker/src/embedding-worker.js'

const status = await getWorkerStatus()
// { pending: 3, ready: 142, failed: 0, timestamp: '...' }
```

## Troubleshooting

### Worker Not Processing

1. Check OpenAI API key: `echo $OPENAI_API_KEY`
2. Check database connection: `npx tsx server/db/index.ts`
3. Check pending count: `npx tsx server/worker-status.ts`

### Rate Limiting

If hitting OpenAI rate limits:
- Increase `POLL_INTERVAL_MS`
- Decrease `BATCH_SIZE`
- Add delay between requests (already 100ms per memory)

### Failed Embeddings

Check logs for specific errors:
```bash
npx tsx server/worker-status.ts
```

Retry failed embeddings:
```sql
UPDATE memories
SET embedding_status = 'pending'
WHERE embedding_status = 'failed';
```

## Cost Estimation

**OpenAI text-embedding-3-small pricing**: $0.00002 / 1K tokens

Average memory: ~50 tokens
- 1,000 memories = $1.00
- 10,000 memories = $10.00
- 100,000 memories = $100.00

## License

MIT
