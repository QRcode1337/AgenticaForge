# Implementation Plan: Actual Deliverables

## Phase 1: Swarm Execution Hook
1. **Locate Swarm Execution:** Open `AgentForge/server/src/api/routes/swarm.ts`.
2. **Add Mock Processing (Bridge):** Because full Agentica `Swarm` execution can take a while and requires deeper LLM orchestration, we will implement the "Completion Hook" that triggers when a swarm finishes. For the immediate plan, we will simulate a short processing delay, then dynamically generate a deliverable based on the incoming nodes/topology.
3. **Generate Deliverable Payload:** Map the input topology into a generated deliverable. For example, if there's a "Coder" agent, generate a `Code Repository` deliverable. If there's a "Researcher", generate a `Research Report`.

## Phase 2: Create Deliverable Entry
1. **Import Dashboard Helper:** Import `createDeliverable` or use the existing dashboard REST structure within `swarm.ts`.
2. **Persist the Output:** Upon swarm completion, execute `createDeliverable` to save it to the database (or in-memory mock if db is not connected).
3. **Broadcast Event:** Use the SSE endpoint `/api/telemetry` to broadcast a `deliverable-created` event to the frontend.

## Phase 3: UI Integration
1. **Listen for Deliverables:** In `AgentForge/src/components/dashboard` or wherever deliverables are displayed, listen to the `/api/telemetry` SSE stream for the `deliverable-created` event.
2. **Auto-refresh UI:** When the event is received, trigger a refetch of the deliverables list so the user immediately sees the output of the swarm execution.
3. **Feedback:** Add a toast or notification in the `SquadBuilder` or main dashboard confirming the deliverable was generated.