# AgentForge + Agentica Integration Plan

## Objective
Activate the existing Agentica backend routing integration within the AgentForge project by linking the local `agentic-flow` package and configuring required environment variables.

## Key Files & Context
- `AgentForge/worker/package.json`
- `AgentForge/worker/src/model-router.ts`
- `Tools/agentica` (`agentic-flow` package)

## Background & Motivation
AgentForge is an in-browser visual dashboard, while Agentica provides a multi-provider ModelRouter backend. AgentForge already has integration points for Agentica (in `worker/src/model-router.ts`), but it falls back to a legacy path if the `agentic-flow` package is not installed or available. Since both exist locally, we just need to connect them.

## Implementation Steps

### 1. Link Local Package
- Navigate to `AgentForge/worker`.
- Update the dependencies to point to the local `Tools/agentica` directory instead of a remote npm version.
- Run `npm install` in the worker to link the package. (Alternatively, build a `.tgz` in `Tools/agentica` and install it).

### 2. Configure Environment Variables
- Create or update `AgentForge/worker/.env`.
- Add standard LLM API keys (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `OPENROUTER_API_KEY`) to enable the multi-provider fallback.

### 3. Verify Integration
- Start the AgentForge worker (`npm run dev`).
- Observe the console output for: `[model-router] Agentica ModelRouter initialized` (verifying it successfully loaded).
- Start the AgentForge UI, open the Command Center, and run `agentica:status` to ensure the catalog and routing are registered.

## Verification & Testing
- Worker logs must explicitly state the Agentica router is initialized.
- Running tasks in AgentForge that dispatch to the worker should successfully route through Agentica.