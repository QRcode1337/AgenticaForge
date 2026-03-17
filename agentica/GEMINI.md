# Agentic-Flow

## Project Overview
**Agentic-Flow** is a production-ready AI agent orchestration platform. Built primarily with TypeScript and Node.js, it provides an advanced framework for creating, deploying, and managing self-learning multi-agent systems. 

**Key Technologies & Features:**
- **AI/Agents:** 66 specialized self-learning agents, 213 MCP tools.
- **SONA (Self-Optimizing Neural Architecture):** Provides adaptive learning with sub-millisecond overhead.
- **AgentDB Integration:** Features advanced vector/graph, GNN (Graph Neural Networks), and various attention mechanisms (Flash, Multi-Head, Linear, Hyperbolic, MoE).
- **Core Dependencies:** `@anthropic-ai/claude-agent-sdk`, `@google/genai`, `agentdb`, `fastmcp`, `react`, `express`.
- **Infrastructure:** Incorporates quantum-resistant Jujutsu VCS, QUIC transport, and distributed consensus protocols.

## Building and Running

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0

### Essential Commands
- **Install Dependencies:** `npm install`
- **Build the Project:** `npm run build` (Builds the main package, `agent-booster`, `reasoningbank`, and `jujutsu` packages)
- **Run Tests:** `npm test` (Runs both main and parallel tests)
- **Run Specific Tests:** 
  - `npm run test:coverage` (Generates coverage report)
  - `npm run test:attention` (Runs attention mechanism integration tests)
- **Run Benchmarks:** 
  - `npm run bench:attention` 
  - `npm run bench:sona`
- **Docker Environments:** 
  - `npm run docker:test` 
  - `npm run docker:bench`

## Development Conventions

### Coding Style & Quality
- **Language:** TypeScript is strictly enforced (`npm run typecheck:strict`).
- **Formatting:** Uses Prettier (`npm run format`, `npm run format:check`). Configuration is located in `config/.prettierrc.cjs` or `.js`.
- **Linting:** Uses ESLint (`npm run lint`, `npm run lint:fix`) with strict configuration (`config/.eslintrc.strict.cjs`).
- **Comprehensive Quality Check:** Run `npm run quality:check` to execute linting, formatting checks, strict type checking, and test coverage evaluation all at once.

### Testing Practices
- The project utilizes **Jest** for its unit and integration testing framework.
- Features a parallel testing suite and extensive benchmarking scripts (`/benchmarks` and `/bench`) for performance-critical components like attention mechanisms, SONA, and QUIC transport.

### Git & Commits
- Uses **Husky** (`.husky/`) and **lint-staged** to enforce pre-commit and pre-push quality checks.
- Adheres to conventional commit message formats (enforced via `@commitlint/config-conventional`).
