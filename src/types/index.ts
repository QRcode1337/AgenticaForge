export type PanelId = 'squad-builder' | 'memory-inspector' | 'training-studio' | 'vector-galaxy' | 'live-feed' | 'integration-hub' | 'command-center'

export type Route = 'home' | 'docs' | 'dashboard'

export interface AgentNode {
  id: string
  name: string
  role: 'scout' | 'worker' | 'coordinator' | 'specialist' | 'guardian'
  status: 'active' | 'idle' | 'training' | 'error'
  model?: string
  memorySlots: number
  maxMemorySlots: number
}

export interface SquadConfig {
  id: string
  name: string
  agents: AgentNode[]
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star'
}

export interface MemorySlot {
  id: string
  tier: 'hot' | 'warm' | 'cold'
  label: string
  tokenBudget: number
  tokensUsed: number
  pattern: string
  lastAccessed: string
}

export interface TrainingSession {
  id: string
  algorithm: 'PPO' | 'DQN' | 'A2C' | 'SAC'
  status: 'running' | 'paused' | 'completed' | 'failed'
  epoch: number
  maxEpochs: number
  reward: number
  loss: number
  learningRate: number
  metrics: TrainingMetric[]
}

export interface TrainingMetric {
  epoch: number
  reward: number
  loss: number
  entropy: number
}

export interface VectorPoint {
  id: string
  position: [number, number, number]
  label: string
  cluster: number
  similarity: number
}

export interface FeedEvent {
  id: string
  timestamp: string
  agentId: string
  agentName: string
  type: 'decision' | 'memory' | 'tool' | 'error' | 'reward'
  message: string
  confidence?: number
}

export interface Integration {
  id: string
  name: string
  type: 'framework' | 'memory' | 'orchestration' | 'model'
  status: 'connected' | 'disconnected' | 'error' | 'configuring'
  icon: string
  config: Record<string, string>
}
