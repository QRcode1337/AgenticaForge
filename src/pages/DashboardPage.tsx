import React, { useState, useCallback, Suspense } from 'react'
import Sidebar from '../components/shared/Sidebar'
import { MemoryProvider } from '../hooks/use-memory'
import { IntegrationProvider } from '../hooks/use-integrations'
import { SwarmProvider } from '../hooks/use-swarm'
import { AuthProvider, useAuth } from '../hooks/use-auth'
import LoginModal from '../components/auth/LoginModal'
import LoadingFallback from '../components/shared/LoadingFallback'
import { useTour, markPanelVisited } from '../hooks/use-tour'
import WalkthroughTour from '../components/walkthrough/WalkthroughTour'
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

// -- Feature flag --
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === 'true'

function DashboardInner() {
  const { user, loading } = useAuth()
  const [activePanel, setActivePanel] = useState<PanelId>('squad-builder')

  const tour = useTour({
    onNavigate: setActivePanel,
  })

  // Track visited panels for coach marks
  const handlePanelChange = useCallback((panel: PanelId) => {
    setActivePanel(panel)
    markPanelVisited(panel)
  }, [])

  if (REQUIRE_AUTH && loading) return <LoadingFallback />
  if (REQUIRE_AUTH && !user) return <LoginModal />

  const ActiveComponent = panelComponents[activePanel]

  return (
    <MemoryProvider>
      <SwarmProvider>
        <IntegrationProvider>
          <div className="flex h-screen w-screen bg-forge-bg overflow-hidden">
            <Sidebar
              activePanel={activePanel}
              onPanelChange={handlePanelChange}
              tourActive={tour.active}
              onTourRestart={tour.restart}
            />
            <main className="flex-1 min-w-0 overflow-hidden w-full md:w-auto">
              <Suspense fallback={<LoadingFallback />}>
                <ActiveComponent />
              </Suspense>
            </main>
            <WalkthroughTour
              active={tour.active}
              stepIndex={tour.stepIndex}
              currentStep={tour.currentStep}
              totalSteps={tour.totalSteps}
              onNext={tour.next}
              onBack={tour.back}
              onSkip={tour.skip}
            />
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
