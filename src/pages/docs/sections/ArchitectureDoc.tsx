export default function ArchitectureDoc() {
  return (
    <section className="space-y-10">
      <div>
        <h2 className="font-sans text-2xl font-bold text-forge-text mb-4">
          Architecture
        </h2>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          AgentForge is built around a 4-subsystem memory engine that runs entirely
          in the browser. Each subsystem handles a distinct responsibility, and
          together they produce a working vector-memory store with temporal awareness
          and pattern detection.
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          TF-IDF Vectorization
        </h3>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          Text content is converted into sparse vectors using term frequency-inverse
          document frequency scoring. Each document is tokenized, weighted against the
          full corpus, and projected into a high-dimensional sparse vector space. No
          external embedding model is required -- the entire pipeline runs in pure
          TypeScript with zero network calls.
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          HNSW Indexing
        </h3>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          A hierarchical navigable small world graph provides approximate nearest
          neighbor search across the vector space. Memories are inserted into a
          multi-layer graph structure that allows sub-linear query times. The index
          supports dynamic inserts without full rebuilds.
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Temporal Decay
        </h3>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          Memories lose relevance over time through an exponential decay function.
          Each access refreshes a memory's importance score, keeping frequently
          referenced entries alive while stale entries fade. The decay rate is
          configurable per memory tier.
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Pattern Learning
        </h3>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          The engine automatically detects recurring memory access patterns and
          surfaces them as learned behaviors. When a sequence of lookups repeats
          beyond a configurable threshold, the pattern is recorded and can be used
          to pre-fetch related memories or inform the swarm simulation.
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Swarm Simulator
        </h3>
        <p className="text-forge-text-soft text-sm leading-relaxed mb-4">
          The swarm simulation runs 15 agents across 5 specialized roles through a
          structured 4-phase lifecycle.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs text-forge-cta shrink-0 w-24">Phase 1</span>
            <p className="text-forge-text-soft text-sm">
              <span className="text-forge-text font-semibold">Discovery</span> --
              Scouts explore the memory space and identify clusters of related entries.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs text-forge-cta shrink-0 w-24">Phase 2</span>
            <p className="text-forge-text-soft text-sm">
              <span className="text-forge-text font-semibold">Negotiation</span> --
              Coordinators assign tasks and resolve conflicts between overlapping objectives.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs text-forge-cta shrink-0 w-24">Phase 3</span>
            <p className="text-forge-text-soft text-sm">
              <span className="text-forge-text font-semibold">Execution</span> --
              Workers and specialists carry out assigned operations on the memory store.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs text-forge-cta shrink-0 w-24">Phase 4</span>
            <p className="text-forge-text-soft text-sm">
              <span className="text-forge-text font-semibold">Reflection</span> --
              Guardians validate results and the swarm consolidates learned patterns.
            </p>
          </div>
        </div>
        <p className="text-forge-muted text-xs mt-4 font-mono">
          Roles: scout, worker, coordinator, specialist, guardian (3 agents each)
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Core Types
        </h3>
        <pre className="bg-forge-elevated border-l-2 border-forge-cta p-6 font-mono text-sm text-forge-text-soft overflow-x-auto rounded-none">
{`interface MemoryEntry {
  id: string
  content: string
  vector: number[]
  timestamp: number
  accessCount: number
  decayScore: number
}`}
        </pre>
      </div>
    </section>
  )
}
