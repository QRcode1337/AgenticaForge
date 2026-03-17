import { motion } from 'framer-motion'
import type { Route } from '../../types'

interface TopNavProps {
  currentRoute: Route
  onNavigate: (r: Route) => void
}

const NAV_LINKS: { label: string; route: Route }[] = [
  { label: 'HOME', route: 'home' },
  { label: 'DOCS', route: 'docs' },
  { label: 'DASHBOARD', route: 'dashboard' },
]

export default function TopNav({ currentRoute, onNavigate }: TopNavProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b border-forge-border backdrop-blur-[12px]"
      style={{ background: 'rgba(8, 10, 15, 0.8)' }}
    >
      {/* Left: Monogram */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 cursor-pointer"
      >
        <span className="text-forge-text font-mono font-bold text-xl leading-none">
          AF
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-forge-dim font-mono hidden sm:inline">
          AGENTFORGE
        </span>
      </button>

      {/* Right: Nav links */}
      <nav className="flex items-center gap-6">
        {NAV_LINKS.map((link) => {
          const isActive = currentRoute === link.route
          return (
            <button
              key={link.route}
              onClick={() => onNavigate(link.route)}
              className={`
                font-mono text-xs uppercase tracking-wider pb-0.5 cursor-pointer
                transition-colors duration-150
                ${isActive
                  ? 'border-b-2 border-forge-cta text-forge-text'
                  : 'border-b-2 border-transparent text-forge-muted hover:text-forge-text'
                }
              `}
            >
              {link.label}
            </button>
          )
        })}
      </nav>
    </motion.header>
  )
}
