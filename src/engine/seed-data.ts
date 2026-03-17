// Phase 17 — Initial data seeding for AgentForge memory engine

interface Seedable {
  store(content: string, namespace: string, metadata?: Record<string, string>): void
  bus: { emit(type: string, message: string, data?: { extra?: Record<string, unknown> }): void }
}

interface SeedEntry {
  content: string
  namespace: string
  metadata: Record<string, string>
}

const ENTRIES: SeedEntry[] = [
  // ── reasoning (7) ──────────────────────────────────────────────
  {
    content: 'Chain-of-thought reasoning improved task completion by 34% compared to direct prompting',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.87' },
  },
  {
    content: 'Multi-step planning with dependency resolution reduces error cascading in complex workflows',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.82' },
  },
  {
    content: 'Bayesian inference applied to tool selection achieves 0.91 precision on standard benchmarks',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.91' },
  },
  {
    content: 'Recursive decomposition of goals into sub-goals enables handling of unbounded complexity',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.78' },
  },
  {
    content: 'Counterfactual reasoning about alternative action paths improves decision quality by 22%',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.85' },
  },
  {
    content: 'Analogical reasoning transfers solution patterns between semantically similar problem domains',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.80' },
  },
  {
    content: 'Abductive inference identifies most likely explanations from incomplete observational data',
    namespace: 'reasoning',
    metadata: { source: 'research', confidence: '0.76' },
  },

  // ── tools (6) ──────────────────────────────────────────────────
  {
    content: 'Code analysis via AST parsing identifies structural patterns with 97% accuracy',
    namespace: 'tools',
    metadata: { source: 'benchmark', latency: '38ms' },
  },
  {
    content: 'Semantic search over documentation returns relevant results in under 50ms for 10K documents',
    namespace: 'tools',
    metadata: { source: 'benchmark', latency: '45ms' },
  },
  {
    content: 'File system operations batch optimized to reduce I/O overhead by 60% in large repositories',
    namespace: 'tools',
    metadata: { source: 'benchmark', latency: '120ms' },
  },
  {
    content: 'API endpoint testing framework validates response schemas against OpenAPI specifications',
    namespace: 'tools',
    metadata: { source: 'benchmark', latency: '62ms' },
  },
  {
    content: 'Git diff analysis detects semantic changes beyond syntactic modifications',
    namespace: 'tools',
    metadata: { source: 'benchmark', latency: '85ms' },
  },
  {
    content: 'Browser automation handles dynamic content rendering with configurable wait strategies',
    namespace: 'tools',
    metadata: { source: 'benchmark', latency: '210ms' },
  },

  // ── memory (6) ─────────────────────────────────────────────────
  {
    content: 'Vector embedding similarity threshold of 0.85 balances recall and precision for memory retrieval',
    namespace: 'memory',
    metadata: { source: 'experiment', version: 'v3' },
  },
  {
    content: 'Temporal decay with 5-minute hot tier half-life maintains relevance of working memory',
    namespace: 'memory',
    metadata: { source: 'experiment', version: 'v3' },
  },
  {
    content: 'HNSW index with M=16 provides O(log n) approximate nearest neighbor search performance',
    namespace: 'memory',
    metadata: { source: 'experiment', version: 'v3' },
  },
  {
    content: 'Co-occurrence patterns between search results boost retrieval accuracy by 18%',
    namespace: 'memory',
    metadata: { source: 'experiment', version: 'v3' },
  },
  {
    content: 'IndexedDB persistence enables cross-session memory retention with minimal write latency',
    namespace: 'memory',
    metadata: { source: 'experiment', version: 'v3' },
  },
  {
    content: 'Memory consolidation during idle periods transfers hot tier patterns to long-term storage',
    namespace: 'memory',
    metadata: { source: 'experiment', version: 'v3' },
  },

  // ── signals (6) ────────────────────────────────────────────────
  {
    content: 'Reward signal propagation through agent hierarchy accelerates convergence by 40%',
    namespace: 'signals',
    metadata: { source: 'monitoring', priority: 'high' },
  },
  {
    content: 'Error rate monitoring triggers adaptive strategy switching when threshold exceeds 5%',
    namespace: 'signals',
    metadata: { source: 'monitoring', priority: 'critical' },
  },
  {
    content: 'Confidence calibration ensures agent self-assessment correlates with actual performance',
    namespace: 'signals',
    metadata: { source: 'monitoring', priority: 'medium' },
  },
  {
    content: 'Attention mechanism focuses processing resources on highest-priority active tasks',
    namespace: 'signals',
    metadata: { source: 'monitoring', priority: 'high' },
  },
  {
    content: 'Feedback loops between coordinator and worker agents maintain system coherence',
    namespace: 'signals',
    metadata: { source: 'monitoring', priority: 'medium' },
  },
  {
    content: 'Anomaly detection in signal patterns identifies potential security threats in real-time',
    namespace: 'signals',
    metadata: { source: 'monitoring', priority: 'critical' },
  },
]

export function seed(engine: Seedable): void {
  for (const entry of ENTRIES) {
    engine.store(entry.content, entry.namespace, entry.metadata)
  }

  engine.bus.emit(
    'seed-complete',
    'Seeded 25 initial entries across 4 namespaces',
    { extra: { count: 25, namespaces: 4 } },
  )
}
