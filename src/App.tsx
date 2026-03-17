import React, { Suspense } from 'react'
import './index.css'
import { useHash } from './hooks/use-hash'
import TopNav from './components/shared/TopNav'
import LoadingFallback from './components/shared/LoadingFallback'

const HomePage = React.lazy(() => import('./pages/HomePage'))
const DocsPage = React.lazy(() => import('./pages/DocsPage'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))

export default function App() {
  const { route, navigate } = useHash()

  return (
    <>
      {route !== 'dashboard' && (
        <TopNav currentRoute={route} onNavigate={navigate} />
      )}
      <Suspense fallback={<LoadingFallback />}>
        {route === 'home' && <HomePage />}
        {route === 'docs' && <DocsPage />}
        {route === 'dashboard' && <DashboardPage />}
      </Suspense>
    </>
  )
}
