import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import type { Route } from '../../types'

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

// --------------------------------------------------------------------------
// Props
// --------------------------------------------------------------------------

interface HeroSectionProps {
  navigate: (r: Route) => void
  reducedMotion: boolean
}

// --------------------------------------------------------------------------
// StatusBar
// --------------------------------------------------------------------------

function StatusBar() {
  const [agentCount, setAgentCount] = useState(0)

  useEffect(() => {
    let frame: number
    const target = 30
    const duration = 2000
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAgentCount(Math.round(eased * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick)
    }, 1800)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 1.6, ease: EASE_OUT_EXPO }}
      className="absolute top-8 right-8 z-30 md:top-12 md:right-12"
    >
      <div
        className="border border-forge-border px-4 py-3 font-mono text-[10px] leading-relaxed tracking-widest uppercase"
        style={{
          background: 'rgba(5, 5, 16, 0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-forge-cta" />
          <span className="text-forge-cta">STATUS: OPERATIONAL</span>
        </div>
        <div className="mt-1 text-forge-dim">BUILD: v1.0.0</div>
        <div className="mt-0.5 text-forge-muted">
          AGENTS: <span className="text-forge-text">{agentCount}</span> ACTIVE
        </div>
      </div>
    </motion.div>
  )
}

// --------------------------------------------------------------------------
// BlinkingCursor
// --------------------------------------------------------------------------

function BlinkingCursor() {
  return (
    <span
      className="animate-blink ml-1 inline-block bg-forge-cta"
      style={{
        width: '0.55em',
        height: '1.1em',
        verticalAlign: 'middle',
        marginBottom: '0.05em',
      }}
    />
  )
}

// --------------------------------------------------------------------------
// FloatingGeometrics  (7 shapes with optional parallax)
// --------------------------------------------------------------------------

interface FloatingGeometricsProps {
  reducedMotion: boolean
}

const SHAPES = [
  // [top, left, size, rotation, color, parallaxFactor]
  { top: '12%', left: '8%', size: 80, rotate: 15, color: '#22C55E', factor: 0.15 },
  { top: '25%', left: '85%', size: 60, rotate: -30, color: '#3B82F6', factor: 0.25 },
  { top: '55%', left: '5%', size: 50, rotate: 45, color: '#A855F7', factor: 0.2 },
  { top: '70%', left: '90%', size: 70, rotate: -15, color: '#22C55E', factor: 0.3 },
  { top: '40%', left: '75%', size: 40, rotate: 60, color: '#3B82F6', factor: 0.1 },
  { top: '80%', left: '45%', size: 55, rotate: -45, color: '#A855F7', factor: 0.35 },
  { top: '15%', left: '55%', size: 45, rotate: 20, color: '#22C55E', factor: 0.18 },
] as const

function FloatingGeometrics({ reducedMotion }: FloatingGeometricsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {SHAPES.map((shape, i) => (
        <FloatingShape
          key={i}
          shape={shape}
          scrollYProgress={scrollYProgress}
          reducedMotion={reducedMotion}
          index={i}
        />
      ))}
    </div>
  )
}

interface FloatingShapeProps {
  shape: (typeof SHAPES)[number]
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress']
  reducedMotion: boolean
  index: number
}

function FloatingShape({ shape, scrollYProgress, reducedMotion, index }: FloatingShapeProps) {
  const yOffset = useTransform(scrollYProgress, [0, 1], [0, -200 * shape.factor])

  const isTriangle = index % 3 === 0
  const isCircle = index % 3 === 1
  // else rectangle

  return (
    <motion.div
      className="absolute"
      style={{
        top: shape.top,
        left: shape.left,
        width: shape.size,
        height: shape.size,
        y: reducedMotion ? 0 : yOffset,
      }}
      initial={{ opacity: 0, scale: 0.5, rotate: shape.rotate }}
      animate={{ opacity: 0.06, scale: 1, rotate: shape.rotate }}
      transition={{
        duration: 1.2,
        delay: 0.8 + index * 0.15,
        ease: EASE_OUT_EXPO,
      }}
    >
      {isTriangle ? (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          stroke={shape.color}
          strokeWidth={1.5}
        >
          <polygon points="50,5 95,95 5,95" />
        </svg>
      ) : isCircle ? (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          stroke={shape.color}
          strokeWidth={1.5}
        >
          <circle cx={50} cy={50} r={45} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          stroke={shape.color}
          strokeWidth={1.5}
        >
          <rect x={5} y={5} width={90} height={90} />
        </svg>
      )}
    </motion.div>
  )
}

// --------------------------------------------------------------------------
// ScrollIndicator
// --------------------------------------------------------------------------

function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.4, duration: 1 }}
    >
      <div className="relative h-12 w-px overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full w-full"
          style={{
            background: 'linear-gradient(to bottom, #22C55E, transparent)',
          }}
          animate={{ y: ['-100%', '100%'] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      <span className="font-mono text-[9px] tracking-[0.3em] text-forge-dim uppercase">
        Scroll
      </span>
    </motion.div>
  )
}

// --------------------------------------------------------------------------
// AccentLine
// --------------------------------------------------------------------------

function AccentLine() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <div
      ref={ref}
      className="absolute left-0 z-20 h-px w-full"
      style={{ top: '38%' }}
    >
      <motion.div
        className="h-full w-full origin-left bg-forge-cta"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 0.15 } : {}}
        transition={{ duration: 1.4, delay: 1.2, ease: EASE_OUT_EXPO }}
      />
    </div>
  )
}

// --------------------------------------------------------------------------
// HeroSection (main export)
// --------------------------------------------------------------------------

export default function HeroSection({ navigate, reducedMotion }: HeroSectionProps) {
  return (
    <section className="clip-diagonal relative min-h-screen overflow-hidden bg-forge-bg">
      {/* Grid background */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.04]" />

      {/* Noise overlay */}
      <div className="noise pointer-events-none absolute inset-0" />

      {/* Scanlines */}
      <div className="scanlines pointer-events-none absolute inset-0" />

      {/* Floating geometric shapes */}
      <FloatingGeometrics reducedMotion={reducedMotion} />

      {/* Accent line */}
      <AccentLine />

      {/* Status bar */}
      <StatusBar />

      {/* ---- Main content ---- */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: EASE_OUT_EXPO }}
        >
          <h1 className="font-sans text-[clamp(3rem,10vw,8rem)] font-black leading-[0.9] tracking-tighter uppercase">
            <span className="text-stroke block">AGENT</span>
            <span className="block text-forge-text">FORGE</span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="mt-6 max-w-lg font-mono text-sm leading-relaxed tracking-wide text-forge-muted md:text-base"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: EASE_OUT_EXPO }}
        >
          Build, train, and deploy autonomous AI agent squads.
          <br />
          Real-time memory. Swarm intelligence. Full control.
          <BlinkingCursor />
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: EASE_OUT_EXPO }}
        >
          <button
            onClick={() => navigate('dashboard')}
            className="group relative font-mono text-xs font-bold tracking-[0.2em] uppercase
              bg-forge-cta text-forge-bg px-8 py-3.5
              transition-all duration-200
              hover:shadow-[0_0_24px_rgba(34,197,94,0.3)]
              active:scale-[0.97]"
          >
            <span className="relative z-10">ENTER DASHBOARD</span>
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
              }}
            />
          </button>

          <button
            onClick={() => navigate('docs')}
            className="font-mono text-xs font-bold tracking-[0.2em] uppercase
              border border-forge-border text-forge-muted px-8 py-3.5
              transition-all duration-200
              hover:border-forge-border-active hover:text-forge-text-soft
              active:scale-[0.97]"
          >
            VIEW DOCS
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator />

      {/* Diagonal clip divider */}
      <div
        className="absolute bottom-0 left-0 z-20 h-[4vw] w-full bg-forge-bg"
        style={{
          clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
        }}
      />
    </section>
  )
}
