// src/hooks/use-tour.ts
import { useState, useEffect, useCallback } from 'react'
import { TOUR_STEPS } from '../components/walkthrough/tour-steps'
import type { PanelId } from '../types'

const STORAGE_KEY_COMPLETED = 'agentforge-tour-completed'
const STORAGE_KEY_VISITED = 'agentforge-visited-panels'

function isCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true'
  } catch {
    return false
  }
}

function markCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY_COMPLETED, 'true')
  } catch { /* noop */ }
}

function markIncomplete() {
  try {
    localStorage.setItem(STORAGE_KEY_COMPLETED, 'false')
  } catch { /* noop */ }
}

export function getVisitedPanels(): PanelId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITED)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function markPanelVisited(panelId: PanelId) {
  const visited = getVisitedPanels()
  if (!visited.includes(panelId)) {
    visited.push(panelId)
    try {
      localStorage.setItem(STORAGE_KEY_VISITED, JSON.stringify(visited))
    } catch { /* noop */ }
  }
}

interface UseTourOptions {
  onNavigate: (panelId: PanelId) => void
  onMobileOpen?: () => void
}

export function useTour({ onNavigate, onMobileOpen }: UseTourOptions) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  // Auto-start on first visit
  useEffect(() => {
    if (!isCompleted()) {
      setActive(true)
      setStepIndex(0)
    }
  }, [])

  const currentStep = TOUR_STEPS[stepIndex]
  const totalSteps = TOUR_STEPS.length

  const navigateToStep = useCallback((index: number) => {
    const step = TOUR_STEPS[index]
    if (step?.panelId) {
      onMobileOpen?.()
      onNavigate(step.panelId)
    }
  }, [onNavigate, onMobileOpen])

  const next = useCallback(() => {
    if (stepIndex < totalSteps - 1) {
      const nextIndex = stepIndex + 1
      setStepIndex(nextIndex)
      navigateToStep(nextIndex)
    } else {
      // Tour complete
      setActive(false)
      markCompleted()
    }
  }, [stepIndex, totalSteps, navigateToStep])

  const back = useCallback(() => {
    if (stepIndex > 0) {
      const prevIndex = stepIndex - 1
      setStepIndex(prevIndex)
      navigateToStep(prevIndex)
    }
  }, [stepIndex, navigateToStep])

  const skip = useCallback(() => {
    setActive(false)
    markCompleted()
  }, [])

  const restart = useCallback(() => {
    markIncomplete()
    setStepIndex(0)
    setActive(true)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!active) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        back()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        skip()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, next, back, skip])

  return {
    active,
    stepIndex,
    currentStep,
    totalSteps,
    next,
    back,
    skip,
    restart,
  }
}
