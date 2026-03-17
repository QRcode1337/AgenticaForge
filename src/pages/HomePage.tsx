import React, { Suspense } from 'react'
import { useHash } from '../hooks/use-hash'
import { useReducedMotion } from '../hooks/use-reduced-motion'
import LoadingFallback from '../components/shared/LoadingFallback'

const HeroSection = React.lazy(() => import('./home/HeroSection'))
const ManifestoSection = React.lazy(() => import('./home/ManifestoSection'))
const PanelsSection = React.lazy(() => import('./home/PanelsSection'))
const ArchitectureSection = React.lazy(() => import('./home/ArchitectureSection'))
const GetStartedSection = React.lazy(() => import('./home/GetStartedSection'))
const FooterSection = React.lazy(() => import('./home/FooterSection'))

export default function HomePage() {
  const { navigate } = useHash()
  const reducedMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-forge-bg overflow-x-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <HeroSection navigate={navigate} reducedMotion={reducedMotion} />
      </Suspense>
      <Suspense fallback={<LoadingFallback />}>
        <ManifestoSection />
      </Suspense>
      <Suspense fallback={<LoadingFallback />}>
        <PanelsSection />
      </Suspense>
      <Suspense fallback={<LoadingFallback />}>
        <ArchitectureSection />
      </Suspense>
      <Suspense fallback={<LoadingFallback />}>
        <GetStartedSection navigate={navigate} />
      </Suspense>
      <Suspense fallback={<LoadingFallback />}>
        <FooterSection navigate={navigate} />
      </Suspense>
    </div>
  )
}
