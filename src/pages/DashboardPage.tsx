import React, { useState, Suspense, useEffect } from 'react'
import Sidebar from '../components/shared/Sidebar'
import { MemoryProvider } from '../hooks/use-memory'
import { IntegrationProvider } from '../hooks/use-integrations'
import { SwarmProvider } from '../hooks/use-swarm'
import { AuthProvider, useAuth } from '../hooks/use-auth'
import LoginModal from '../components/auth/LoginModal'
import LoadingFallback from '../components/shared/LoadingFallback'
import type { PanelId } from '../types'

const SquadBuilder = React.lazy(() => import('../components/squad-builder/SquadBuilder'))
const MemoryInspector = React.lazy(() => import('../components/memory-inspector/MemoryInspector'))
const TrainingStudio = React.lazy(() => import('../components/training-studio/TrainingStudio'))
const VectorGalaxy = React.lazy(() => import('../components/vector-galaxy/VectorGalaxy'))
const LiveFeed = React.lazy(() => import('../components/live-feed/LiveFeed'))
const IntegrationHub = React.lazy(() => import('../components/integration-hub/IntegrationHub'))
const CommandCenter = React.lazy(() => import('../components/command-center/CommandCenter'))

const panelComponents: Record<PanelId, React.LazyExoticComponent<React.ComponentType>> = {
  'squad-builder': SquadBuilder,
  'memory-inspector': MemoryInspector,
  'training-studio': TrainingStudio,
  'vector-galaxy': VectorGalaxy,
  'live-feed': LiveFeed,
  'integration-hub': IntegrationHub,
  'command-center': CommandCenter,
}

// ── Feature flag ──────────────────────────────────────────────────
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === 'true'

function DashboardInner() {
  const { user, loading } = useAuth()
  const [activePanel, setActivePanel] = useState<PanelId>(() => {
    const saved = localStorage.getItem('agentforge-active-panel')
    return (saved as PanelId) || 'squad-builder'
  })

  useEffect(() => {
    localStorage.setItem('agentforge-active-panel', activePanel)
  }, [activePanel])

  if (REQUIRE_AUTH && loading) return <LoadingFallback />
  if (REQUIRE_AUTH && !user) return <LoginModal />

  const ActiveComponent = panelComponents[activePanel]

  return (
    <MemoryProvider>
      <SwarmProvider>
        <IntegrationProvider>
          <div className="flex h-screen w-screen bg-forge-bg overflow-hidden">
            <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <ActiveComponent />
              </Suspense>
            </main>
          </div>
        </IntegrationProvider>
      </SwarmProvider>
    </MemoryProvider>
  )
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardInner />
    </AuthProvider>
  )
}
