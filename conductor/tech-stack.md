# AgenticaForge Tech Stack

## Frontend (AgentForge Dashboard)

- **Framework**: React 19 (Vite 7)
- **Styling**: Tailwind CSS 4 (+ Tactical Terminal Theme)
- **Visuals**:
  - **React Flow**: Agent topology graph representation.
  - **Three.js / React Three Fiber**: 3D Vector Galaxy visualization.
  - **Recharts**: SONA training metrics and neural telemetry.
  - **Framer Motion**: Micro-animations and transitions.
- **State & Hooks**: Custom hooks for `use-memory`, `use-swarm`, and `use-integrations` linked to backend proxies.

## Backend (Server)

- **Runtime**: Node.js (v25+)
- **Execution**: `tsx` (TypeScript Execution Engine)
- **Framework**: Express API
- **Persistence**:
  - **Drizzle ORM**: Type-safe database mapping.
  - **PostgreSQL / Supabase**: Primary relational and vector data store.
  - **AgentDB**: Local agentic knowledge indexing.
- **Real-time**: Server-Sent Events (SSE) for telemetry and event streaming.

## Background Services (Worker)

- **Engine**: **Agentica (`agentic-flow`)** - The core agentic toolkit.
- **Task Processor**: Handles LLM orchestration, tool execution, and long-running swarm loops.
- **Embedder**: Local vector embedding generation (Ollama integration).
- **Cleaner**: automated maintenance of logs and short-term memory clusters.

## Infrastructure

- **Orchestration**: `concurrently` root script managing all three layers.
- **Version Control**: Git (Unified Monorepo).
- **Security**: AES-256 encryption for API credentials stored in Supabase.
