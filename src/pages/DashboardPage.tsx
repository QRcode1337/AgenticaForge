import React, { useState, useCallback, useMemo, Suspense } from 'react'
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
import ToastContainer from '../components/shared/ToastContainer'
import CommandPalette, { type PaletteCommand } from '../components/shared/CommandPalette'
import SettingsDrawer from '../components/shared/SettingsDrawer'
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { usePanelNavigation } from '../hooks/use-panel-navigation'
import { toast } from '../hooks/use-toast'

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

  const PANEL_IDS: PanelId[] = ['squad-builder', 'memory-inspector', 'training-studio', 'vector-galaxy', 'live-feed', 'integration-hub', 'command-center']

  const [activePanel, setActivePanel] = useState<PanelId>(() => {
    try {
      const saved = localStorage.getItem('agentforge-active-panel') as PanelId | null
      if (saved && PANEL_IDS.includes(saved)) return saved
    } catch { /* noop */ }
    return 'squad-builder'
  })

  const tour = useTour({
    onNavigate: setActivePanel,
  })

  // Track visited panels for coach marks
  const handlePanelChange = useCallback((panel: PanelId) => {
    setActivePanel(panel)
    markPanelVisited(panel)
    try { localStorage.setItem('agentforge-active-panel', panel) } catch { /* noop */ }
  }, [])

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { navigateTo } = usePanelNavigation(handlePanelChange)

  const commands: PaletteCommand[] = useMemo(() => [
    { id: 'panel-squad', label: 'Squad Builder', category: 'Panels', action: () => handlePanelChange('squad-builder') },
    { id: 'panel-memory', label: 'Memory Inspector', category: 'Panels', action: () => handlePanelChange('memory-inspector') },
    { id: 'panel-training', label: 'Training Studio', category: 'Panels', action: () => handlePanelChange('training-studio') },
    { id: 'panel-vector', label: 'Vector Galaxy', category: 'Panels', action: () => handlePanelChange('vector-galaxy') },
    { id: 'panel-feed', label: 'Live Feed', category: 'Panels', action: () => handlePanelChange('live-feed') },
    { id: 'panel-integration', label: 'Integration Hub', category: 'Panels', action: () => handlePanelChange('integration-hub') },
    { id: 'panel-command', label: 'Command Center', category: 'Panels', action: () => handlePanelChange('command-center') },
    { id: 'action-create-agent', label: 'Create Agent', category: 'Actions', action: () => handlePanelChange('squad-builder') },
    { id: 'action-store-memory', label: 'Store Memory', category: 'Actions', action: () => handlePanelChange('memory-inspector') },
    { id: 'action-start-training', label: 'Start Training', category: 'Actions', action: () => handlePanelChange('training-studio') },
    { id: 'action-add-integration', label: 'Add Integration', category: 'Actions', action: () => handlePanelChange('integration-hub') },
    { id: 'action-replay-tour', label: 'Replay Tour', category: 'Actions', action: () => tour.restart() },
    { id: 'action-settings', label: 'Open Settings', category: 'Actions', action: () => setSettingsOpen(true) },
  ], [handlePanelChange, tour])

  useKeyboardShortcuts({
    onTogglePalette: useCallback(() => {
      setPaletteOpen((prev) => !prev)
      if (settingsOpen) setSettingsOpen(false)
    }, [settingsOpen]),
    onPanelSwitch: useCallback((index: number) => {
      if (index >= 0 && index < PANEL_IDS.length) {
        handlePanelChange(PANEL_IDS[index])
      }
    }, [handlePanelChange]),
    onToggleSidebar: useCallback(() => {}, []),
    onEscape: useCallback(() => {
      if (paletteOpen) setPaletteOpen(false)
      else if (settingsOpen) setSettingsOpen(false)
    }, [paletteOpen, settingsOpen]),
    disabled: tour.active,
  })

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
              onSettingsOpen={() => setSettingsOpen(true)}
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
            <ToastContainer />
            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              commands={commands}
            />
            <SettingsDrawer
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
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
