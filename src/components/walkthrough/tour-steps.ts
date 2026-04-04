// src/components/walkthrough/tour-steps.ts
import type { PanelId } from '../../types'

export interface TourStep {
  id: string
  title: string
  copy: string
  targetSelector: string | null  // null = centered (no target)
  panelId: PanelId | null        // null = don't navigate
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'navigation',
    title: 'NAVIGATION',
    copy: 'Your command deck. Seven panels, each a different weapon in your arsenal.',
    targetSelector: '[data-tour-step="sidebar-nav"]',
    panelId: null,
  },
  {
    id: 'squad-builder',
    title: 'SQUAD BUILDER',
    copy: 'Build and connect agents into operational squads. Assign roles, define topology, deploy.',
    targetSelector: '[data-tour-step="squad-builder"]',
    panelId: 'squad-builder',
  },
  {
    id: 'memory-inspector',
    title: 'MEMORY INSPECTOR',
    copy: 'Manage agent memory across hot, warm, and cold tiers. Tag, search, and budget tokens.',
    targetSelector: '[data-tour-step="memory-inspector"]',
    panelId: 'memory-inspector',
  },
  {
    id: 'training-studio',
    title: 'TRAINING STUDIO',
    copy: 'Train agents with reinforcement learning. Pick an algorithm, tune hyperparameters, watch metrics.',
    targetSelector: '[data-tour-step="training-studio"]',
    panelId: 'training-studio',
  },
  {
    id: 'vector-galaxy',
    title: 'VECTOR GALAXY',
    copy: 'Visualize embeddings in 3D space. Explore clusters, spot patterns, navigate the latent space.',
    targetSelector: '[data-tour-step="vector-galaxy"]',
    panelId: 'vector-galaxy',
  },
  {
    id: 'live-feed',
    title: 'LIVE FEED',
    copy: 'Real-time event stream from your agents. Filter by type, monitor decisions and errors.',
    targetSelector: '[data-tour-step="live-feed"]',
    panelId: 'live-feed',
  },
  {
    id: 'integration-hub',
    title: 'INTEGRATION HUB',
    copy: 'Connect external services — frameworks, models, orchestration tools. Configure and monitor status.',
    targetSelector: '[data-tour-step="integration-hub"]',
    panelId: 'integration-hub',
  },
  {
    id: 'command-center',
    title: 'COMMAND CENTER',
    copy: 'Terminal interface for direct agent commands. Spawn, query, train — all from the command line.',
    targetSelector: '[data-tour-step="command-center"]',
    panelId: 'command-center',
  },
  {
    id: 'complete',
    title: 'TOUR COMPLETE',
    copy: "You're briefed. Start building, or replay this tour anytime from the sidebar.",
    targetSelector: null,
    panelId: null,
  },
]
