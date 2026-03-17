import type {
  AgentNode,
  SquadConfig,
  MemorySlot,
  TrainingSession,
  TrainingMetric,
  VectorPoint,
  FeedEvent,
  Integration,
} from '../types'

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const mockAgents: AgentNode[] = [
  {
    id: 'agent-nexus-07',
    name: 'NEXUS-07',
    role: 'scout',
    status: 'active',
    model: 'claude-opus-4-6',
    memorySlots: 3,
    maxMemorySlots: 5,
  },
  {
    id: 'agent-void-analyzer',
    name: 'VOID-ANALYZER',
    role: 'specialist',
    status: 'active',
    model: 'claude-sonnet-4-20250514',
    memorySlots: 5,
    maxMemorySlots: 8,
  },
  {
    id: 'agent-sentinel-prime',
    name: 'SENTINEL-PRIME',
    role: 'guardian',
    status: 'idle',
    model: 'claude-opus-4-6',
    memorySlots: 4,
    maxMemorySlots: 6,
  },
  {
    id: 'agent-forge-worker-12',
    name: 'FORGE-WORKER-12',
    role: 'worker',
    status: 'training',
    model: 'llama-3.3-70b',
    memorySlots: 2,
    maxMemorySlots: 4,
  },
  {
    id: 'agent-cortex-cmd',
    name: 'CORTEX-CMD',
    role: 'coordinator',
    status: 'active',
    model: 'claude-opus-4-6',
    memorySlots: 6,
    maxMemorySlots: 10,
  },
]

// ---------------------------------------------------------------------------
// Squad Configuration
// ---------------------------------------------------------------------------

export const mockSquadConfig: SquadConfig = {
  id: 'squad-alpha',
  name: 'Alpha Squad',
  agents: mockAgents,
  topology: 'hierarchical',
}

// ---------------------------------------------------------------------------
// Memory Slots
// ---------------------------------------------------------------------------

export const mockMemorySlots: MemorySlot[] = [
  {
    id: 'mem-001',
    tier: 'hot',
    label: 'Active Session Context',
    tokenBudget: 8192,
    tokensUsed: 6841,
    pattern: 'session-memory',
    lastAccessed: '2026-02-08T05:18:42Z',
  },
  {
    id: 'mem-002',
    tier: 'hot',
    label: 'Working Scratchpad',
    tokenBudget: 4096,
    tokensUsed: 3210,
    pattern: 'scratchpad',
    lastAccessed: '2026-02-08T05:19:01Z',
  },
  {
    id: 'mem-003',
    tier: 'hot',
    label: 'Reasoning Chain Buffer',
    tokenBudget: 16384,
    tokensUsed: 11207,
    pattern: 'reasoning-bank',
    lastAccessed: '2026-02-08T05:17:55Z',
  },
  {
    id: 'mem-004',
    tier: 'warm',
    label: 'Semantic Vector Index',
    tokenBudget: 32768,
    tokensUsed: 24576,
    pattern: 'vector-index',
    lastAccessed: '2026-02-08T04:52:30Z',
  },
  {
    id: 'mem-005',
    tier: 'warm',
    label: 'Tool Invocation History',
    tokenBudget: 8192,
    tokensUsed: 5890,
    pattern: 'tool-history',
    lastAccessed: '2026-02-08T04:48:12Z',
  },
  {
    id: 'mem-006',
    tier: 'warm',
    label: 'Agent Communication Log',
    tokenBudget: 16384,
    tokensUsed: 9437,
    pattern: 'message-log',
    lastAccessed: '2026-02-08T04:30:05Z',
  },
  {
    id: 'mem-007',
    tier: 'cold',
    label: 'Episodic Long-Term Store',
    tokenBudget: 65536,
    tokensUsed: 42100,
    pattern: 'episodic-memory',
    lastAccessed: '2026-02-07T22:15:00Z',
  },
  {
    id: 'mem-008',
    tier: 'cold',
    label: 'Compressed Knowledge Base',
    tokenBudget: 131072,
    tokensUsed: 87340,
    pattern: 'knowledge-base',
    lastAccessed: '2026-02-07T18:40:22Z',
  },
  {
    id: 'mem-009',
    tier: 'cold',
    label: 'Historical Decision Archive',
    tokenBudget: 65536,
    tokensUsed: 51200,
    pattern: 'decision-archive',
    lastAccessed: '2026-02-06T14:20:00Z',
  },
  {
    id: 'mem-010',
    tier: 'warm',
    label: 'Reward Signal Cache',
    tokenBudget: 4096,
    tokensUsed: 2744,
    pattern: 'reward-cache',
    lastAccessed: '2026-02-08T05:10:33Z',
  },
]

// ---------------------------------------------------------------------------
// Training Metrics (45 epochs of PPO with improving reward curve)
// ---------------------------------------------------------------------------

function generateTrainingMetrics(count: number): TrainingMetric[] {
  const metrics: TrainingMetric[] = []
  for (let i = 1; i <= count; i++) {
    const progress = i / count
    // Reward: starts around 0.1, climbs with diminishing returns toward ~0.85
    const baseReward = 0.1 + 0.75 * (1 - Math.exp(-3.5 * progress))
    const rewardNoise = (Math.sin(i * 1.7) * 0.03) + (Math.cos(i * 0.9) * 0.02)
    // Loss: starts around 2.4, decays toward ~0.3
    const baseLoss = 0.3 + 2.1 * Math.exp(-3.0 * progress)
    const lossNoise = Math.sin(i * 2.3) * 0.05
    // Entropy: starts around 1.8, decays toward ~0.4
    const baseEntropy = 0.4 + 1.4 * Math.exp(-2.5 * progress)
    const entropyNoise = Math.cos(i * 1.1) * 0.03

    metrics.push({
      epoch: i,
      reward: parseFloat((baseReward + rewardNoise).toFixed(4)),
      loss: parseFloat(Math.max(0.1, baseLoss + lossNoise).toFixed(4)),
      entropy: parseFloat(Math.max(0.2, baseEntropy + entropyNoise).toFixed(4)),
    })
  }
  return metrics
}

const trainingMetrics = generateTrainingMetrics(45)

export const mockTrainingSession: TrainingSession = {
  id: 'train-ppo-alpha-001',
  algorithm: 'PPO',
  status: 'running',
  epoch: 45,
  maxEpochs: 100,
  reward: trainingMetrics[44].reward,
  loss: trainingMetrics[44].loss,
  learningRate: 0.0003,
  metrics: trainingMetrics,
}

// ---------------------------------------------------------------------------
// Vector Points (30 points, 4 clusters)
// ---------------------------------------------------------------------------

export const mockVectorPoints: VectorPoint[] = [
  // Cluster 0 - Decision Reasoning (upper-left quadrant)
  { id: 'vec-001', position: [-3.2, 2.8, 1.1], label: 'causal-inference', cluster: 0, similarity: 0.94 },
  { id: 'vec-002', position: [-2.9, 3.1, 0.7], label: 'chain-of-thought', cluster: 0, similarity: 0.91 },
  { id: 'vec-003', position: [-3.5, 2.5, 1.4], label: 'hypothesis-testing', cluster: 0, similarity: 0.88 },
  { id: 'vec-004', position: [-2.7, 3.4, 0.3], label: 'deductive-step', cluster: 0, similarity: 0.86 },
  { id: 'vec-005', position: [-3.0, 2.2, 1.8], label: 'abductive-reasoning', cluster: 0, similarity: 0.82 },
  { id: 'vec-006', position: [-3.8, 2.9, 0.9], label: 'logical-entailment', cluster: 0, similarity: 0.79 },
  { id: 'vec-007', position: [-2.5, 3.6, 0.5], label: 'counterfactual', cluster: 0, similarity: 0.76 },
  { id: 'vec-008', position: [-3.3, 2.0, 1.6], label: 'bayesian-update', cluster: 0, similarity: 0.73 },

  // Cluster 1 - Tool Operations (lower-right quadrant)
  { id: 'vec-009', position: [3.1, -2.4, -0.5], label: 'file-read-op', cluster: 1, similarity: 0.96 },
  { id: 'vec-010', position: [2.8, -2.7, -0.2], label: 'grep-search', cluster: 1, similarity: 0.93 },
  { id: 'vec-011', position: [3.4, -2.1, -0.8], label: 'bash-execution', cluster: 1, similarity: 0.89 },
  { id: 'vec-012', position: [2.6, -3.0, 0.1], label: 'write-mutation', cluster: 1, similarity: 0.85 },
  { id: 'vec-013', position: [3.7, -2.5, -1.1], label: 'api-invocation', cluster: 1, similarity: 0.81 },
  { id: 'vec-014', position: [3.0, -1.9, -0.4], label: 'web-fetch', cluster: 1, similarity: 0.77 },
  { id: 'vec-015', position: [2.4, -2.8, 0.3], label: 'glob-pattern', cluster: 1, similarity: 0.74 },

  // Cluster 2 - Memory Patterns (upper-right quadrant)
  { id: 'vec-016', position: [2.3, 3.5, 2.0], label: 'episodic-recall', cluster: 2, similarity: 0.95 },
  { id: 'vec-017', position: [2.6, 3.2, 1.7], label: 'semantic-retrieval', cluster: 2, similarity: 0.92 },
  { id: 'vec-018', position: [1.9, 3.8, 2.3], label: 'context-window', cluster: 2, similarity: 0.87 },
  { id: 'vec-019', position: [2.8, 2.9, 1.4], label: 'token-compression', cluster: 2, similarity: 0.84 },
  { id: 'vec-020', position: [2.1, 3.6, 2.6], label: 'memory-consolidation', cluster: 2, similarity: 0.80 },
  { id: 'vec-021', position: [3.0, 3.0, 1.1], label: 'attention-head', cluster: 2, similarity: 0.76 },
  { id: 'vec-022', position: [1.7, 4.0, 1.9], label: 'kv-cache-lookup', cluster: 2, similarity: 0.72 },
  { id: 'vec-023', position: [2.5, 3.3, 2.8], label: 'embedding-similarity', cluster: 2, similarity: 0.69 },

  // Cluster 3 - Communication Signals (lower-left quadrant)
  { id: 'vec-024', position: [-2.1, -3.3, -1.5], label: 'agent-handoff', cluster: 3, similarity: 0.97 },
  { id: 'vec-025', position: [-2.4, -3.0, -1.2], label: 'broadcast-signal', cluster: 3, similarity: 0.93 },
  { id: 'vec-026', position: [-1.8, -3.6, -1.8], label: 'consensus-vote', cluster: 3, similarity: 0.90 },
  { id: 'vec-027', position: [-2.7, -2.7, -0.9], label: 'task-delegation', cluster: 3, similarity: 0.86 },
  { id: 'vec-028', position: [-1.5, -3.9, -2.1], label: 'status-heartbeat', cluster: 3, similarity: 0.82 },
  { id: 'vec-029', position: [-2.3, -3.4, -1.0], label: 'error-escalation', cluster: 3, similarity: 0.78 },
  { id: 'vec-030', position: [-2.0, -2.5, -1.6], label: 'reward-propagation', cluster: 3, similarity: 0.75 },
]

// ---------------------------------------------------------------------------
// Feed Events (15 recent events)
// ---------------------------------------------------------------------------

export const mockFeedEvents: FeedEvent[] = [
  {
    id: 'evt-001',
    timestamp: '2026-02-08T05:19:42Z',
    agentId: 'agent-cortex-cmd',
    agentName: 'CORTEX-CMD',
    type: 'decision',
    message: 'Routed sub-task #47 to VOID-ANALYZER based on semantic affinity score 0.93',
    confidence: 0.93,
  },
  {
    id: 'evt-002',
    timestamp: '2026-02-08T05:19:38Z',
    agentId: 'agent-nexus-07',
    agentName: 'NEXUS-07',
    type: 'tool',
    message: 'Executed Grep across 142 files in /src -- matched 8 candidates for auth-flow pattern',
    confidence: 0.87,
  },
  {
    id: 'evt-003',
    timestamp: '2026-02-08T05:19:30Z',
    agentId: 'agent-void-analyzer',
    agentName: 'VOID-ANALYZER',
    type: 'memory',
    message: 'Promoted reasoning chain from warm tier to hot tier -- token delta +2,048',
  },
  {
    id: 'evt-004',
    timestamp: '2026-02-08T05:19:22Z',
    agentId: 'agent-sentinel-prime',
    agentName: 'SENTINEL-PRIME',
    type: 'decision',
    message: 'Threat assessment complete: 0 critical, 2 low-severity anomalies detected in agent traffic',
    confidence: 0.98,
  },
  {
    id: 'evt-005',
    timestamp: '2026-02-08T05:19:15Z',
    agentId: 'agent-forge-worker-12',
    agentName: 'FORGE-WORKER-12',
    type: 'reward',
    message: 'Training reward signal received: +0.042 for successful code generation step',
    confidence: 0.71,
  },
  {
    id: 'evt-006',
    timestamp: '2026-02-08T05:19:08Z',
    agentId: 'agent-cortex-cmd',
    agentName: 'CORTEX-CMD',
    type: 'tool',
    message: 'Spawned parallel sub-agents for security analysis and performance profiling',
    confidence: 0.95,
  },
  {
    id: 'evt-007',
    timestamp: '2026-02-08T05:18:55Z',
    agentId: 'agent-void-analyzer',
    agentName: 'VOID-ANALYZER',
    type: 'decision',
    message: 'Identified architectural bottleneck in message-passing layer -- recommending ring topology switch',
    confidence: 0.82,
  },
  {
    id: 'evt-008',
    timestamp: '2026-02-08T05:18:42Z',
    agentId: 'agent-nexus-07',
    agentName: 'NEXUS-07',
    type: 'memory',
    message: 'Compressed session context from 8,192 to 6,841 tokens -- reclaimed 1,351 token budget',
  },
  {
    id: 'evt-009',
    timestamp: '2026-02-08T05:18:30Z',
    agentId: 'agent-forge-worker-12',
    agentName: 'FORGE-WORKER-12',
    type: 'error',
    message: 'Training step 46 failed: gradient explosion detected -- rolling back to checkpoint 45',
  },
  {
    id: 'evt-010',
    timestamp: '2026-02-08T05:18:18Z',
    agentId: 'agent-sentinel-prime',
    agentName: 'SENTINEL-PRIME',
    type: 'tool',
    message: 'Validated 12 outbound API calls against security policy -- all passed integrity checks',
    confidence: 1.0,
  },
  {
    id: 'evt-011',
    timestamp: '2026-02-08T05:18:05Z',
    agentId: 'agent-cortex-cmd',
    agentName: 'CORTEX-CMD',
    type: 'decision',
    message: 'Load-balanced 3 pending tasks across idle workers -- estimated completion in 4.2s',
    confidence: 0.89,
  },
  {
    id: 'evt-012',
    timestamp: '2026-02-08T05:17:55Z',
    agentId: 'agent-void-analyzer',
    agentName: 'VOID-ANALYZER',
    type: 'memory',
    message: 'Flushed reasoning-bank tier: 11,207 tokens consolidated into long-term episodic store',
  },
  {
    id: 'evt-013',
    timestamp: '2026-02-08T05:17:40Z',
    agentId: 'agent-nexus-07',
    agentName: 'NEXUS-07',
    type: 'tool',
    message: 'Scanning dependency graph -- resolved 23 transitive imports across 7 modules',
    confidence: 0.91,
  },
  {
    id: 'evt-014',
    timestamp: '2026-02-08T05:17:28Z',
    agentId: 'agent-forge-worker-12',
    agentName: 'FORGE-WORKER-12',
    type: 'reward',
    message: 'Cumulative episode reward reached 0.78 -- approaching convergence threshold of 0.85',
    confidence: 0.78,
  },
  {
    id: 'evt-015',
    timestamp: '2026-02-08T05:17:10Z',
    agentId: 'agent-cortex-cmd',
    agentName: 'CORTEX-CMD',
    type: 'decision',
    message: 'Squad topology evaluation complete: hierarchical outperforms mesh by 17% for current workload',
    confidence: 0.96,
  },
]

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export const mockIntegrations: Integration[] = [
  {
    id: 'int-openclaw',
    name: 'OpenClaw',
    type: 'framework',
    status: 'connected',
    icon: 'Cog',
    config: {
      endpoint: 'https://api.openclaw.dev/v2',
      version: '2.4.1',
      authMethod: 'api-key',
    },
  },
  {
    id: 'int-claude-flow',
    name: 'claude-flow',
    type: 'orchestration',
    status: 'connected',
    icon: 'Workflow',
    config: {
      endpoint: 'ws://localhost:3200',
      version: '1.8.0',
      mode: 'orchestrator',
    },
  },
  {
    id: 'int-agentdb',
    name: 'AgentDB',
    type: 'memory',
    status: 'connected',
    icon: 'Database',
    config: {
      connectionString: 'agentdb://localhost:5433/forge',
      version: '3.1.2',
      poolSize: '10',
    },
  },
  {
    id: 'int-ollama',
    name: 'Ollama',
    type: 'model',
    status: 'disconnected',
    icon: 'Cpu',
    config: {
      endpoint: 'http://localhost:11434',
      version: '0.6.2',
      defaultModel: 'llama3.3:70b',
    },
  },
  {
    id: 'int-langchain',
    name: 'LangChain',
    type: 'framework',
    status: 'configuring',
    icon: 'Link',
    config: {
      version: '0.3.14',
      runtime: 'langchain-js',
      vectorStore: 'chroma',
    },
  },
  {
    id: 'int-huggingface',
    name: 'HuggingFace',
    type: 'model',
    status: 'connected',
    icon: 'Brain',
    config: {
      endpoint: 'https://api-inference.huggingface.co',
      version: 'inference-api-v2',
      authMethod: 'bearer-token',
    },
  },
]
