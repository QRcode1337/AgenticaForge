# 🚀 AgenticaForge: The Full-Stack Agentic OS

**AgenticaForge** is a production-grade AI agent orchestration platform that bridges visual intuition with professional-grade backend logic. It integrates the **AgentForge Visual Dashboard** with the **Agentica (`agentic-flow`) Engine**, powered by a high-performance Node.js service architecture.

![AgenticaForge Interface](screenshots/homepage.png)

## 🏗️ System Architecture

AgenticaForge is built on a distributed, event-driven architecture designed for high-concurrency agentic swarms.

*   **Frontend (AgentForge)**: A React 19 visual dashboard for designing agent topologies, inspecting memory tiers (Hot/Warm/Cold), and monitoring real-time telemetry from the SONA training engine.
*   **Backend API (Server)**: An Express service that manages the persistence layer (Postgres/Drizzle), exposes agent controllers, and handles the "Simulation to Reality" bridge.
*   **Background Worker**: A dedicated task processor that executes LLM calls, handles long-running agentic loops, and generates vector embeddings for the ReasoningBank.
*   **Core Engine (Agentica)**: The `agentic-flow` toolkit—a production-ready library featuring 66 specialized agents, 213 MCP tools, and quantum-resistant version control.

## ✨ Core Features

### 🧩 Visual Swarm Orchestration
Design complex multi-agent systems using a visual graph editor (React Flow). Transition seamlessly from **Mock Simulations** in the browser to **Real Swarm Execution** on the backend with a single click.

### 🧠 ReasoningBank (Three-Tier Memory)
A sophisticated memory management system inspired by neurological models:
*   **Hot Memory**: Real-time context, rapid access, high decay.
*   **Warm Memory**: Recent patterns and frequently accessed clusters.
*   **Cold Memory**: Long-term persistent knowledge, indexed via HNSW for semantic retrieval.

### 🌐 Multi-Provider Intelligence
Native support for **OpenAI** (O1/GPT-4o), **Anthropic** (Claude 3.5/Sonnet), **HuggingFace**, and **Ollama**. The `ModelRouter` automatically handles fallback, load balancing, and provider-specific optimizations.

### 📊 SONA Neural Telemetry
Monitor the health and "learning" of your agents in real-time. High-resolution charts track reward curves, pattern density, and loss metrics as agents refine their strategies.

---

## 🚀 Quick Start

AgenticaForge is a monorepo that manages its own dependencies and service lifecycle.

### 1. Clone & Setup
```bash
git clone https://github.com/QRcode1337/AgenticaForge.git
cd AgenticaForge
npm install
```

### 2. Configure Environment
Update the `.env` files in both the `server/` and `worker/` directories with your API keys:
```text
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=...
DATABASE_URL=...
```

### 3. Launch the Stack
Start the development server, background worker, and frontend dashboard concurrently:
```bash
npm run dev:all
```

*   **Dashboard**: `http://localhost:3000`
*   **API Server**: `http://localhost:3001`
*   **Worker**: Running in background via `tsx`

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, Vite 7, Tailwind 4, React Flow, Three.js, Recharts.
*   **Backend**: Node.js (v25+), Express, Drizzle ORM, Postgres.
*   **Engine**: Agentica (`agentic-flow`), AgentDB, SONA Neural Layer.
*   **Runtime**: `tsx` (TypeScript Execution Engine), Concurrently.

## 📁 Project Structure

```bash
AgenticaForge/
├── agentforge/      # Next.js / React Visual Interface
├── agentica/        # Core Agentic Engine (agentic-flow SDK)
├── server/          # Express API Gateway & Shared DB Layer
├── worker/          # Background LLM Executor & Embedding Service
├── conductor/       # Orchestration plans and integration logic
├── docs/            # Architecture & Getting Started guides
└── package.json     # Root dev:all script and monorepo config
```

## 📜 License

MIT © [QRcode1337](https://github.com/QRcode1337)
