import { useState } from 'react'
import { motion } from 'framer-motion'
import type { PanelId } from '../../types'

interface SidebarProps {
  activePanel: PanelId
  onPanelChange: (panel: PanelId) => void
}

interface NavItem {
  id: PanelId
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'squad-builder',
    label: 'Squad Builder',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <circle cx="14.5" cy="14.5" r="3.5" />
      </svg>
    ),
  },
  {
    id: 'memory-inspector',
    label: 'Memory Inspector',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="10" cy="5" rx="7" ry="2.5" />
        <path d="M3 5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V5" />
        <path d="M3 9v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V9" />
        <path d="M3 13v2c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-2" />
      </svg>
    ),
  },
  {
    id: 'training-studio',
    label: 'Training Studio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 15 5 9 8 12 11 4 14 10 17 6" />
        <line x1="2" y1="17" x2="18" y2="17" />
        <line x1="2" y1="3" x2="2" y2="17" />
      </svg>
    ),
  },
  {
    id: 'vector-galaxy',
    label: 'Vector Galaxy',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <ellipse cx="10" cy="10" rx="8" ry="3" />
        <line x1="10" y1="2" x2="10" y2="18" />
        <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="8" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="13" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="13" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'live-feed',
    label: 'Live Feed',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="14" rx="2" />
        <line x1="5" y1="8" x2="8" y2="8" />
        <line x1="5" y1="11" x2="12" y2="11" />
        <line x1="5" y1="14" x2="10" y2="14" />
        <polyline points="14 7 16 7" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'integration-hub',
    label: 'Integration Hub',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="5" r="2.5" />
        <circle cx="5" cy="15" r="2.5" />
        <circle cx="15" cy="15" r="2.5" />
        <line x1="10" y1="7.5" x2="5" y2="12.5" />
        <line x1="10" y1="7.5" x2="15" y2="12.5" />
        <line x1="7.5" y1="15" x2="12.5" y2="15" />
      </svg>
    ),
  },
  {
    id: 'command-center',
    label: 'Command Center',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="13" rx="1.5" />
        <polyline points="5 9 7 7 9 9" />
        <line x1="10" y1="9" x2="15" y2="9" />
        <line x1="5" y1="12" x2="15" y2="12" />
      </svg>
    ),
  },
]

const sidebarVariants = {
  collapsed: { width: 64 },
  expanded: { width: 240 },
}

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.aside
      className="flex flex-col h-screen bg-forge-bg border-r border-forge-border select-none font-mono"
      variants={sidebarVariants}
      animate={expanded ? 'expanded' : 'collapsed'}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded((prev) => !prev)}
    >
      {/* Logo — click to return to homepage */}
      <button
        className="flex items-center h-16 px-4 border-b border-forge-border shrink-0 w-full cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          location.hash = '#/'
        }}
      >
        <div className="flex flex-col items-start">
          <span className="text-forge-text font-mono font-bold text-xl leading-none">
            AF
          </span>
          <motion.span
            className="text-[9px] uppercase tracking-[0.2em] text-forge-dim whitespace-nowrap overflow-hidden leading-tight mt-0.5"
            animate={{ opacity: expanded ? 1 : 0, height: expanded ? 'auto' : 0 }}
            transition={{ duration: 0.2 }}
          >
            AGENTFORGE
          </motion.span>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-hidden">
        {navItems.map((item) => {
          const isActive = activePanel === item.id
          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation()
                onPanelChange(item.id)
              }}
              className={`
                relative flex items-center gap-3 h-10 rounded-none px-3
                transition-colors duration-150 cursor-pointer
                ${isActive
                  ? 'border-l-2 border-forge-cta text-forge-text'
                  : 'border-l-2 border-transparent text-forge-dim hover:text-forge-text'
                }
              `}
            >
              {/* Active chevron prefix */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="text-forge-cta text-xs font-bold shrink-0 -ml-1 mr-0"
                  transition={{ duration: 0.2 }}
                >
                  &gt;
                </motion.span>
              )}

              <span className="shrink-0">{item.icon}</span>

              <motion.span
                className="text-xs font-mono uppercase tracking-wider whitespace-nowrap overflow-hidden"
                animate={{
                  opacity: expanded ? 1 : 0,
                  width: expanded ? 'auto' : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.span>
            </button>
          )
        })}
      </nav>

      {/* Status indicator */}
      <div className="flex items-center gap-2 h-12 px-4 border-t border-forge-border shrink-0 overflow-hidden">
        <span className="text-forge-cta font-mono text-sm animate-pulse shrink-0">_</span>
        <motion.span
          className="text-[10px] text-forge-dim font-mono uppercase tracking-wider whitespace-nowrap overflow-hidden"
          animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
          transition={{ duration: 0.2 }}
        >
          SYSTEM ONLINE
        </motion.span>
      </div>
    </motion.aside>
  )
}
