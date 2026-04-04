// src/components/walkthrough/WalkthroughTour.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TourStep } from './tour-steps'

interface WalkthroughTourProps {
  active: boolean
  stepIndex: number
  currentStep: TourStep
  totalSteps: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface Position {
  top: number
  left: number
  arrowSide: 'left' | 'right' | 'top'
}

function useTargetPosition(selector: string | null, active: boolean): {
  position: Position | null
  targetRect: DOMRect | null
} {
  const [position, setPosition] = useState<Position | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const calculate = useCallback(() => {
    if (!selector) {
      // Centered tooltip (no target)
      setPosition({
        top: window.innerHeight / 2 - 80,
        left: window.innerWidth / 2 - 180,
        arrowSide: 'top',
      })
      setTargetRect(null)
      return
    }

    const el = document.querySelector(selector)
    if (!el) {
      setPosition(null)
      setTargetRect(null)
      return
    }

    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    const tooltipWidth = 340
    const tooltipHeight = 160
    const gap = 12

    // Default: position to the right of target
    let top = rect.top + rect.height / 2 - tooltipHeight / 2
    let left = rect.right + gap
    let arrowSide: Position['arrowSide'] = 'left'

    // If tooltip would overflow right edge, flip to left side
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = rect.left - tooltipWidth - gap
      arrowSide = 'right'
    }

    // Clamp vertical position
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))

    setPosition({ top, left, arrowSide })
  }, [selector])

  useEffect(() => {
    if (!active) return
    calculate()

    const ro = new ResizeObserver(calculate)
    ro.observe(document.body)
    window.addEventListener('resize', calculate)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', calculate)
    }
  }, [active, calculate])

  return { position, targetRect }
}

export default function WalkthroughTour({
  active,
  stepIndex,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: WalkthroughTourProps) {
  const { position, targetRect } = useTargetPosition(
    currentStep.targetSelector,
    active,
  )
  const tooltipRef = useRef<HTMLDivElement>(null)

  if (!active || !position) return null

  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const isCentered = currentStep.targetSelector === null

  return (
    <>
      {/* Glow effect on target element */}
      {targetRect && (
        <div
          className="fixed pointer-events-none z-[998]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 6,
            boxShadow: '0 0 12px #4ade8066, 0 0 24px #4ade8033',
            animation: 'tour-glow-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          ref={tooltipRef}
          className="fixed z-[999]"
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, x: position.arrowSide === 'left' ? -8 : position.arrowSide === 'right' ? 8 : 0, y: position.arrowSide === 'top' ? -8 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="relative font-mono"
            style={{
              width: isCentered ? 360 : 340,
              background: '#0f1117',
              border: '1px solid #4ade8066',
              boxShadow: '0 0 20px #4ade8015, 0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            {/* Arrow */}
            {position.arrowSide === 'left' && (
              <div
                style={{
                  position: 'absolute',
                  left: -7,
                  top: '50%',
                  marginTop: -6,
                  width: 12,
                  height: 12,
                  background: '#0f1117',
                  borderLeft: '1px solid #4ade8066',
                  borderBottom: '1px solid #4ade8066',
                  transform: 'rotate(45deg)',
                }}
              />
            )}
            {position.arrowSide === 'right' && (
              <div
                style={{
                  position: 'absolute',
                  right: -7,
                  top: '50%',
                  marginTop: -6,
                  width: 12,
                  height: 12,
                  background: '#0f1117',
                  borderRight: '1px solid #4ade8066',
                  borderTop: '1px solid #4ade8066',
                  transform: 'rotate(45deg)',
                }}
              />
            )}

            {/* Scanline accent */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
              }}
            />

            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#4ade80', marginBottom: 4 }}>
                {isLast ? 'BRIEFING COMPLETE' : `STEP ${stepIndex + 1} OF ${totalSteps}`}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#e2e4e9', marginBottom: 8 }}>
                BRIEFING: {currentStep.title}
              </div>
              <div style={{ fontSize: 11, color: '#9ca0ab', lineHeight: 1.5 }}>
                {currentStep.copy}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid #252830' }}>
                <button
                  onClick={onSkip}
                  style={{ background: 'none', border: 'none', color: '#484c58', fontSize: 10, letterSpacing: '0.15em', fontFamily: 'monospace', cursor: 'pointer' }}
                >
                  {isLast ? '' : 'SKIP TOUR'}
                </button>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {!isFirst && (
                    <button
                      onClick={onBack}
                      style={{ background: 'none', border: '1px solid #252830', color: '#9ca0ab', padding: '4px 12px', fontSize: 10, letterSpacing: '0.1em', fontFamily: 'monospace', cursor: 'pointer' }}
                    >
                      ← BACK
                    </button>
                  )}
                  <button
                    onClick={onNext}
                    style={{ background: 'none', border: '1px solid #4ade80', color: '#4ade80', padding: '4px 12px', fontSize: 10, letterSpacing: '0.1em', fontFamily: 'monospace', cursor: 'pointer' }}
                  >
                    {isLast ? 'DISMISS' : 'NEXT →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 3, padding: '0 20px 12px' }}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 1,
                    background: i <= stepIndex ? '#4ade80' : '#252830',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Global glow pulse keyframes */}
      <style>{`
        @keyframes tour-glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  )
}
