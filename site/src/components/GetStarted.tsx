'use client'

import { motion } from 'framer-motion'

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ================================================================
   GET STARTED — Minimal CTA band.
   One terminal block. Two buttons. Breathing room.
   ================================================================ */

export default function GetStarted() {
  return (
    <section
      className="relative py-40 md:py-56"
      style={{ background: 'var(--bg-slab)' }}
    >
      {/* Noise */}
      <div className="noise absolute inset-0 pointer-events-none" />

      {/* Top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'var(--concrete-500)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-16 lg:px-24">
        {/* Heading — centered, lots of space below */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-24 md:mb-32"
        >
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--concrete-400)',
            }}
          >
            {'// 3 COMMANDS. THAT\'S IT.'}
          </p>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-bold uppercase leading-[0.9] tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--concrete-100)',
            }}
          >
            GET STARTED
          </h2>
        </motion.div>

        {/* Single terminal block — centered, constrained width */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="max-w-xl mx-auto mb-24 md:mb-32"
        >
          <div
            style={{
              background: 'var(--bg-block)',
              borderLeft: '2px solid var(--signal-green)',
            }}
          >
            <pre
              className="p-8 text-sm leading-[2]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Line prompt text="git clone agentforge" />
              <Line prompt text="cd agentforge && npm install" />
              <Line prompt text="npm run dev" />
              <Line text="" />
              <Line text="  Ready at http://localhost:3000" color="var(--signal-green)" />
            </pre>
          </div>
        </motion.div>

        {/* CTAs — centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <a
            href="/dashboard"
            className="group inline-flex items-center gap-3 px-10 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-200"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'var(--signal-green)',
              color: 'var(--bg-void)',
              border: '2px solid var(--signal-green)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--signal-green)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--signal-green)'
              e.currentTarget.style.color = 'var(--bg-void)'
            }}
          >
            LAUNCH DASHBOARD
            <span className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
          </a>

          <a
            href="/docs"
            className="inline-flex items-center gap-2 py-4 text-sm uppercase tracking-wider transition-colors duration-200"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--concrete-300)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--signal-green)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--concrete-300)'
            }}
          >
            READ THE DOCS &rarr;
          </a>
        </motion.div>
      </div>
    </section>
  )
}

/* Small helper for terminal lines */
function Line({
  prompt,
  text,
  color,
}: {
  prompt?: boolean
  text: string
  color?: string
}) {
  return (
    <div className="flex">
      {prompt && (
        <span style={{ color: 'var(--signal-green)', marginRight: '0.75em' }}>&gt;</span>
      )}
      <span style={{ color: color || (prompt ? 'var(--concrete-100)' : 'var(--concrete-400)') }}>
        {text}
      </span>
    </div>
  )
}
