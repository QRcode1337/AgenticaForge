# AgentForge Use Cases

Most people who download AgentForge will open it, see a dark dashboard, click around for two minutes, and close it. They'll think "cool UI" and never come back.

That's a waste. This document exists to show you what you're actually sitting on top of.

AgentForge is not a chatbot wrapper. It's not a LangChain GUI. It's an **orchestration platform** where multiple AI agents work together on a shared task, pass information through a vector memory layer, and report results in real-time while you watch. Every panel in the dashboard is a window into a different part of that pipeline.

Here's what you can actually do with it.

---

## 1. Run a Research Swarm That Thinks Across Agents

This is the headline feature, and most people will miss it entirely because they won't realize the agents are talking to each other through memory.

### What's really happening

When you launch a research swarm, you're not just running four Claude calls in sequence. You're running a **phased intelligence pipeline** where:

- **Phase 1 (Discovery):** Two scout agents search the web in parallel. Each scout has a different angle — one focuses on capabilities and trends, the other on trade-offs and criticism. They independently store their best findings into shared vector memory under the `research` namespace.

- **Phase 2 (Analysis):** An analyst agent wakes up, searches that same memory, and looks for patterns, contradictions, and gaps across both scouts' work. It stores structured insights under the `analysis` namespace.

- **Phase 3 (Synthesis):** A coordinator agent searches both `research` and `analysis` namespaces, synthesizes everything into an executive briefing with recommendations and risk assessment, and stores the final report under `reports`.

The key insight: **agents don't pass JSON to each other.** They read and write to the same vector database. Agent-2 doesn't know what Agent-1 said — it searches memory semantically and builds on whatever is relevant. This means the pipeline is robust to individual agent failures. If Scout-1 finds nothing useful, the analyst still has Scout-2's data.

### What this looks like in practice

You type a topic. Four tasks hit the queue. Your worker picks them up one by one (discovery tasks first, since they're queued first). As each agent runs, you can watch the events stream into the **Live Feed** panel. You'll see tool calls (`web_search`, `memory_store`), decisions, and completions. Within 2-3 minutes, the coordinator drops a multi-section report into memory.

The report isn't a summary of the other agents' outputs. It's a synthesis. The coordinator reads raw research findings and structured analysis, then produces something neither could have produced alone.

### Scenarios this is built for

**Competitive landscape analysis:**
"AI agent frameworks in 2026: LangGraph vs CrewAI vs AutoGen vs custom" — scouts find current capabilities and developer complaints, analyst identifies which framework wins for which use case, coordinator produces a recommendation.

**Technical due diligence:**
"Should we adopt Postgres + pgvector or go with a dedicated vector DB like Pinecone?" — scouts gather benchmarks and production war stories, analyst maps the trade-offs to your specific requirements, coordinator gives a go/no-go.

**Market research:**
"What are enterprise customers actually paying for AI coding assistants?" — scouts find pricing data and analyst reports, analyst identifies pricing models and segments, coordinator produces a market overview.

**Literature review:**
"Current state of RLHF alternatives: DPO, KTO, IPO" — scouts gather paper summaries and benchmark results, analyst compares approaches, coordinator writes a research brief.

### How to launch one

```bash
# Default topic
npx tsx server/run-swarm.ts

# Custom topic
npx tsx server/run-swarm.ts "WebAssembly in production: who is using it and for what"

# Watch it execute
npx tsx server/check-swarm.ts <run-id>
```

Or from the dashboard: open **Command Center**, type `swarm:start`. Watch events flow in through **Live Feed**. When it finishes, open **Memory Inspector** to browse the findings.

### What you might not realize

- You can run multiple swarms. Each gets its own `swarm_run_id`. Previous results stay in memory.
- Memories persist across swarms. Your second research swarm can search findings from your first one.
- You can edit `server/run-swarm.ts` to change the agent count, phases, tools, and system prompts. The 4-agent template is a starting point, not a limit.
- Each agent can use different tools. Scouts get `web_search` + `memory_store`. The analyst gets `memory_search` + `memory_store`. You could add `code_interpreter`, custom API tools, or anything your worker supports.

---

## 2. Build a Persistent Knowledge Base That Agents Can Search

This is the part most people treat as a database table. It's not. It's a **vector memory system with tiered lifecycle management**.

### Why this matters

Every agent interaction produces information. Without persistent memory, that information dies when the conversation ends. With AgentForge's memory layer, agents can:

- Store facts they've learned and retrieve them weeks later
- Build on each other's findings across separate sessions
- Search semantically — not just by keyword, but by meaning

### How the memory pipeline actually works

```
1. Agent (or you) stores text
   └─> Row inserted into `memories` table
       ├── content: the text
       ├── namespace: logical grouping
       ├── embedding_status: "pending"
       └── embedding: null

2. Worker embedder loop (runs every 5 seconds)
   └─> Finds rows where embedding_status = "pending"
       └─> Calls Ollama (qwen3-embedding:4b, 1536 dims)
           └─> Updates row: embedding = [0.023, -0.117, ...], status = "ready"

3. Now searchable by semantic similarity
   └─> RPC: search_memories(query_embedding, match_threshold, match_count)
```

The embedding happens **asynchronously**. You don't wait for it. The memory is immediately available for exact-match queries; semantic search activates once the vector is filled (usually within seconds).

### The three tiers aren't cosmetic

Memories live in three tiers based on access patterns:

| Tier | What lives here | What it means |
|------|----------------|---------------|
| **Hot** | Frequently accessed, recently created, high-score entries | Active working memory. The stuff agents are using right now. |
| **Warm** | Moderate access, aging content | Background knowledge. Still relevant but not in active use. |
| **Cold** | Rarely accessed, old content | Archive. Candidates for cleanup or compression. |

This isn't just a label. The Memory Inspector panel shows you the distribution. When your hot tier is overloaded and your cold tier is empty, your agents are thrashing on too much context. When everything is cold, your agents aren't using their memory.

### What you can actually do with this

**Build a living research library:**
Run multiple research swarms on related topics. Each swarm's findings stay in memory. Over time, you build a searchable knowledge base that future agents can query. The third swarm on "AI agents" benefits from the first two's findings.

**Store your own knowledge:**
From the Command Center terminal:
```
mem:store --ns notes --content "Our API rate limit is 1000 req/min per key, resets at midnight UTC"
mem:store --ns decisions --content "We chose Postgres over DynamoDB because of pgvector and we need semantic search"
mem:store --ns patterns --content "When the embedder fails, check that Ollama is running on port 11434"
```

Now any agent with `memory_search` can find these. When an agent is debugging an embedding failure, it can search memory and find your note about Ollama.

**Audit what agents know:**
```
mem:namespaces          # See all logical groupings
mem:tiers               # See hot/warm/cold distribution
mem:search "database"   # Find everything agents know about databases
```

**Clean up stale knowledge:**
```
mem:purge-cold          # Remove all cold-tier entries
mem:delete --id <id>    # Remove a specific entry
```

### What you might not realize

- Embeddings run locally through Ollama. No data leaves your machine for the embedding step. You're not paying OpenAI per embedding.
- The `content_hash` field prevents exact duplicates. If two agents try to store the same text, only one copy exists.
- Memories have a `visibility` field: `private` (only your agents) or `shared` (cross-user). This is the foundation for multi-user agent collaboration.
- The `ttl_seconds` field lets you create self-expiring memories. Store a cache entry that disappears after an hour.
- You can search by namespace. `mem:search --ns research "agent frameworks"` only searches within research findings.

---

## 3. Design Custom Agent Teams on a Visual Canvas

The Squad Builder isn't a diagram tool. It's a live topology editor that maps directly to the agents in your database.

### What the canvas actually represents

Each node on the canvas is a real agent record in Supabase. When you create an agent through the Agent Editor, it gets a row in the `agents` table with:

- **Name:** What it's called in the UI and in event logs
- **Role:** Determines its position in the swarm hierarchy (scout, worker, coordinator, specialist, guardian)
- **System prompt:** The personality and instructions that shape everything it does
- **Model:** Which LLM it uses (Claude Sonnet 4.5, etc.)
- **Tools:** What capabilities it has (`web_search`, `memory_store`, `memory_search`, `code_interpreter`)

The edges between nodes represent communication pathways. In a hierarchical topology, the coordinator delegates to specialists who delegate to workers. In a mesh, everyone can communicate with everyone.

### The five roles and when to use each

**Scout** — First contact. Scouts are cheap and fast. Give them `web_search` and `memory_store`. They go wide, not deep. Use 2-4 scouts when you need broad coverage of a topic.

**Specialist** — Deep expertise. Specialists get `memory_search` plus domain-specific tools. They read what scouts found and apply analytical frameworks. Use specialists when you need analysis, not just information.

**Worker** — Task execution. Workers build, transform, and produce output. Give them `code_interpreter` or custom tools. They're the ones who actually write the report, generate the code, or build the artifact.

**Coordinator** — Orchestration. One coordinator per swarm, usually at the end. It searches all namespaces, synthesizes findings, makes final decisions, and produces the deliverable. Give it `memory_search` + `memory_store`.

**Guardian** — Quality gate. Guardians validate output before it's delivered. They check for inconsistencies, verify claims, and flag problems. Use them when accuracy matters more than speed.

### Topologies and when they matter

| Topology | Structure | Best for |
|----------|-----------|----------|
| **Hierarchical** | Coordinator → Specialists → Workers | Clear chain of command, phased work |
| **Mesh** | Everyone connects to everyone | Brainstorming, collaborative analysis |
| **Star** | One central node, all others connect to it | Single expert with multiple helpers |
| **Ring** | Each agent passes to the next | Sequential refinement, assembly line |

### How to design a squad from scratch

1. Open **Squad Builder**
2. Click **NEW AGENT** to open the editor side panel
3. Fill in name, role, system prompt, model, and tools
4. Click save — it's now in Supabase
5. Repeat for each agent you need
6. Drag edges between agents to define communication pathways
7. Choose your topology from the dropdown

Or for a quick start: click **LOAD V3 SWARM** to get a pre-built 15-agent topology with all four phases populated.

### What you might not realize

- Clicking any agent node opens the Agent Editor with that agent's details. You can edit system prompts and tools in real-time.
- The V3 Swarm template has 15 agents across 4 phases (discovery, analysis, synthesis, optimization) — you can modify it freely.
- When you click **RUN SIM**, the agents actually execute. This isn't a mockup. Tasks go into the queue, the worker claims them, and Claude generates responses.
- Agent nodes show live status (green = active, yellow = idle, red = error, purple = completed) and memory usage bars that update in real-time during execution.

---

## 4. Watch Agents Think in Real-Time

The Live Feed is not a log viewer. It's a **real-time operations dashboard** for your agent swarm.

### What each event type actually tells you

**TOOL events** — An agent called a function. This is how you know agents are actually working, not just generating text. When you see `web_search` calls, the agent is hitting the Brave Search API. When you see `memory_store`, it's writing findings to the vector database. When you see `memory_search`, it's retrieving context from previous agents' work.

**DECISION events** — An agent chose a strategy. These tell you *how* the agent is thinking. "Selected tool: web-search with confidence 0.94" means the agent had multiple options and chose web search. "Delegated subtask to ECHO-PRIME" means the coordinator is distributing work.

**MEMORY events** — Something happened in the memory layer. Storage, retrieval, tier promotion, eviction. These tell you about the knowledge flow between agents. When you see a burst of memory events during the synthesis phase, that's the coordinator pulling together findings from all the scouts.

**ERROR events** — Something failed. Rate limits, timeouts, malformed responses. Errors are highlighted in red and visible even when you're scrolling. These are your early warning system.

**REWARD events** — Quality signals. Task completion scores, efficiency metrics. These are how you know whether agents are producing useful work or wasting tokens.

### How to read the feed during a live swarm

When a research swarm is running, you'll see a pattern:

```
1. swarm_started event       — Swarm launched
2. TOOL: web_search (Scout-1) — Scouts searching in parallel
3. TOOL: web_search (Scout-2)
4. MEMORY: stored (Scout-1)   — Scouts saving findings
5. MEMORY: stored (Scout-2)
6. TOOL: memory_search (Analyst) — Analyst reading scouts' work
7. MEMORY: stored (Analyst)   — Analyst saving insights
8. TOOL: memory_search (Coordinator) — Coordinator gathering everything
9. MEMORY: stored (Coordinator) — Final report saved
```

If you see errors between steps 2 and 3, a scout failed. If you see a long gap between steps 5 and 6, the analyst is thinking hard. The feed tells you the story of how your agents are collaborating.

### The throughput chart at the bottom

This isn't decoration. The sparkline shows events per 3-second window over time. During a swarm run, you'll see spikes when agents are active and valleys between phases. A flat line means nothing is happening. A sustained high rate means your worker is churning through tasks.

### The agent sidebar on the right

Each agent card shows:
- **Status** — Running (green), Idle (yellow), Error (red)
- **Last message** — The most recent event from this agent
- **Action buttons** — Pause, Resume, Terminate, Restart, Debug

This gives you per-agent control during a live run. If Scout-2 is burning tokens on bad searches, you can pause it without stopping the entire swarm.

### What you might not realize

- When the backend is connected, the Live Feed loads the 50 most recent historical events on mount. You're seeing real past activity, not just live data.
- The filter buttons at the top actually work and are useful. During debugging, filter to ERRORS only. During analysis, filter to MEMORY only to watch the knowledge flow.
- Mock events (the simulated data for demo purposes) are automatically disabled when you're connected to Supabase. If you want to see the demo data alongside real data, toggle MOCK ON.
- Events have a 30-day TTL. Old events are automatically cleaned up by the worker's cleanup loop.

---

## 5. Operate Everything From a Terminal

The Command Center is a full operational terminal. Everything you can do through the GUI, you can do faster here. And some things you can only do here.

### Memory operations most people don't try

**Semantic search across all your agents' knowledge:**
```
mem:search "what are the limitations of LangGraph"
```
This doesn't do keyword matching. It searches by meaning. If an agent stored "LangGraph struggles with non-DAG topologies," that will match even though the words are different.

**See how your memory is distributed:**
```
mem:tiers
```
This shows you hot/warm/cold distribution. If everything is hot, your agents are either very active or you're not running decay cycles. If everything is cold, your knowledge base is stale.

**Explore what namespaces exist:**
```
mem:namespaces
```
After a few swarm runs, you might have `research`, `analysis`, `reports`, `notes`, `patterns`. Each namespace is a logical grouping that agents can search independently.

**Export the entire engine state to the browser console:**
```
db:export
```
Opens the browser console (F12) with a full JSON dump of all entries, vectors, HNSW graph state, and pattern data. Useful for debugging or backing up state.

### Swarm operations

**Check what's happening right now:**
```
swarm:status
```
Shows running/stopped, current phase, and agent counts by status.

**See every agent in the swarm:**
```
swarm:agents
```
Tabular display with status, name, role, phase, and domain for each agent.

**Launch from the terminal:**
```
swarm:start
```
Starts a swarm simulation. Combined with the Squad Builder's topology, this lets you test different agent configurations.

### What you might not realize

- Every command execution gets a unique `run_id` displayed in brackets at the bottom. Click it to open a detail drawer showing the full execution trace.
- The right sidebar has quick-action buttons for common operations. You don't have to type everything.
- The status dashboard at the bottom right shows live stats: memory entry count, HNSW layers, pattern count, swarm status. These update in real-time.
- When the backend is connected, `mem:store` writes to both the local engine AND Supabase. When you `mem:search`, it queries both. The local engine gives instant results; the backend gives persistent, cross-session results.

---

## 6. Visualize How Your Agents' Knowledge Connects

The Vector Galaxy panel looks like a screensaver. It's not. It's a **semantic map** of everything your agents know.

### How to read it

Every dot is a memory entry. The position in 3D space is determined by the memory's embedding vector, projected down to three dimensions using UMAP/t-SNE-style dimensionality reduction.

**Clusters = related knowledge.** When you see a tight group of dots, those memories are semantically similar. After a research swarm, you'll typically see:
- A cluster of raw research findings (things scouts found)
- A cluster of analytical insights (things the analyst produced)
- An isolated dot or small cluster for the final report (unique synthesis)

**Gaps = blind spots.** Large empty areas between clusters suggest topics your agents haven't explored. If your research cluster is far from your analysis cluster, the analyst may have gone in a different direction than the scouts.

**Colors = namespaces.** Each namespace gets a distinct color. At a glance you can see the composition of your knowledge base: how much is research, how much is analysis, how much is decisions, etc.

### When this is actually useful

- After running 3-4 research swarms, open Vector Galaxy to see how the topics relate to each other
- If agents are producing redundant results, you'll see tight, overlapping clusters instead of spread-out coverage
- Before running a new swarm, look at the galaxy to identify what areas you haven't covered yet
- Use it to explain to stakeholders how your AI research pipeline builds knowledge over time

---

## 7. Connect Services and Manage Credentials Securely

The Integration Hub isn't just a settings page. It's where you wire up the services that make agents useful.

### What each integration enables

| Service | What agents can do with it |
|---------|--------------------------|
| **Anthropic (Claude)** | Think. Reason. Produce output. This is the brain. |
| **Brave Search** | Search the live web. Without this, scouts can't do reconnaissance. |
| **Ollama** | Generate embeddings locally. Without this, memories aren't semantically searchable. |
| **OpenAI** | Alternative LLM provider and embedding model. Fallback if you want cloud embeddings. |

### Security model

Credentials are **AES-256 encrypted** at rest. Each credential record stores:
- `encrypted_key` — The actual API key, encrypted
- `iv` — Initialization vector for the encryption
- `key_version` — Supports key rotation without invalidating existing credentials

The browser never sees raw API keys for backend services. The worker reads encrypted credentials from Supabase using the service role key and decrypts them at execution time.

### What you might not realize

- Ollama runs entirely local. When you configure Ollama as your embedding provider, zero data leaves your machine for the embedding step. The embedding model (`qwen3-embedding:4b`) runs on your GPU/CPU.
- You can swap embedding providers without re-embedding everything. Change from OpenAI to Ollama, and the worker will process new memories with the new provider. Old embeddings remain valid (both produce 1536-dim vectors).
- The `key_version` field means you can rotate API keys without downtime. Insert a new credential with `key_version: 2` and the worker will start using it.

---

## 8. Train and Fine-Tune Agent Behavior

The Training Studio panel is where you shape how agents learn from their runs.

### What this means in practice

After every swarm run, there's data: what worked, what failed, what took too many tokens, what produced useful findings. The Training Studio lets you:

- Review agent performance across runs
- Identify which system prompts produced the best results
- See token usage patterns per agent and per phase
- Adjust agent configurations based on empirical results

This is the feedback loop that turns AgentForge from a one-shot tool into a system that gets better over time. Most people skip this panel because it looks like analytics. It's not analytics — it's how you tune your swarm.

---

## Putting It All Together: A Real Session

Here's what a complete session looks like when you use AgentForge the way it's designed:

```
1. Log in at localhost:3000
   └─> Dashboard loads, all panels connected to Supabase

2. Open Squad Builder
   └─> See your agents from previous sessions
   └─> Create a new agent if needed (NEW AGENT → Agent Editor)

3. Open Command Center, launch a swarm
   └─> swarm:start
   └─> or: npx tsx server/run-swarm.ts "your topic"

4. Switch to Live Feed to watch execution
   └─> Events stream in as scouts search, analysts think, coordinator writes
   └─> Filter to ERRORS if something looks wrong
   └─> Filter to MEMORY to watch the knowledge flow

5. When the swarm completes, open Memory Inspector
   └─> Browse findings organized by tier
   └─> Expand entries to read full content
   └─> See the research → analysis → reports pipeline

6. Open Vector Galaxy to see how knowledge clusters
   └─> Identify gaps, redundancies, and relationships

7. Go back to Command Center for deeper exploration
   └─> mem:search "the specific thing you're looking for"
   └─> mem:tiers to check memory health
   └─> db:stats to see engine metrics

8. Run another swarm on a related topic
   └─> New agents can search findings from the first run
   └─> Knowledge compounds across sessions
```

The dashboard isn't seven separate tools. It's seven views into the same system. The agents you build in Squad Builder execute in the Live Feed. The memories they create appear in Memory Inspector. The vectors they produce visualize in Vector Galaxy. The Command Center controls all of it.

**The whole point is the compound effect.** One swarm run is interesting. Five swarm runs on related topics, building on each other's findings, with knowledge persisting across sessions — that's when AgentForge becomes genuinely useful.

---

## Architecture Reference

```
Browser (React 19 + Vite + Tailwind 4)
  |
  |── Auth layer (Supabase Auth, JWT sessions)
  |── Real-time subscriptions (postgres_changes)
  |── REST queries (filtered by RLS: auth.uid() = user_id)
  |
  v
Supabase (Postgres 15 + pgvector + Auth + Realtime)
  |
  |── 8 tables
  |   ├── agents        — Agent definitions (name, role, system_prompt, tools, model)
  |   ├── memories      — Vector memory store (content, embedding, tier, namespace)
  |   ├── events        — Activity log with 30-day TTL
  |   ├── swarm_runs    — Swarm execution records (status, phase, config)
  |   ├── agent_tasks   — Task queue (input, output, status, lease_token)
  |   ├── credentials   — AES-256 encrypted API keys
  |   ├── messages      — Agent conversation history + tool traces
  |   └── profiles      — User profiles
  |
  |── RLS policies on all tables
  |── 3 RPCs: claim_next_task, renew_lease, search_memories
  |── Atomic task claiming: FOR UPDATE SKIP LOCKED + UUID lease tokens
  |
  v
Worker (Node.js on Railway)
  |
  |── Task Executor
  |   ├── Claims pending tasks with atomic lease
  |   ├── Calls Claude API with agent's system prompt + tools
  |   ├── Executes tool calls (web_search, memory_store, memory_search)
  |   ├── Streams events to Supabase (visible in Live Feed)
  |   └── Stores output + token count on completion
  |
  |── Embedder
  |   ├── Polls for embedding_status = "pending" every 5 seconds
  |   ├── Calls Ollama qwen3-embedding:4b (local, 1536 dims)
  |   └── Updates memory row with vector + status = "ready"
  |
  └── Cleanup
      └── Expires events older than 30 days (runs hourly)
```

**Design principles:**

- **Embeddings are async.** Never block the hot path. Insert pending, worker fills later.
- **Task claiming is atomic.** `FOR UPDATE SKIP LOCKED` prevents double-execution. UUID lease tokens prevent stale workers from completing tasks they no longer own.
- **Everything is real-time.** No polling. Supabase postgres_changes push updates to the browser instantly.
- **Local-first option.** The old browser engine runs behind a feature flag. If you don't configure Supabase, the entire app works in-browser with local state.
- **No vendor lock-in on embeddings.** Ollama runs local. Switch to OpenAI with one env var change. Both produce 1536-dim vectors.
