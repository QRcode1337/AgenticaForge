import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemory, useBackendTierBreakdown } from '../../hooks/use-memory.ts'

// ── Feature flag ──────────────────────────────────────────────────
const USE_BACKEND = true

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TierId = 'hot' | 'warm' | 'cold'

interface MemorySlot {
  id: string
  label: string
  pattern: string
  tokensUsed: number
  tokenBudget: number
  lastAccessed: string
  details: string
}

interface Tier {
  id: TierId
  name: string
  description: string
  color: string
  glowColor: string
  bgTint: string
  icon: React.ReactNode
  slots: MemorySlot[]
}

// ---------------------------------------------------------------------------
// Tier metadata (static visual properties for each tier)
// ---------------------------------------------------------------------------

const TIER_META: Record<TierId, Omit<Tier, 'slots'>> = {
  hot: {
    id: 'hot',
    name: 'HOT',
    description: 'Active context, high-frequency access',
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.15)',
    bgTint: 'rgba(239, 68, 68, 0.05)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1C9 1 4 6 4 10a5 5 0 0 0 10 0C14 6 9 1 9 1Z" />
        <path d="M9 17a2.5 2.5 0 0 0 2.5-2.5C11.5 12 9 10 9 10s-2.5 2-2.5 4.5A2.5 2.5 0 0 0 9 17Z" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  warm: {
    id: 'warm',
    name: 'WARM',
    description: 'Recent patterns, moderate access',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    bgTint: 'rgba(245, 158, 11, 0.05)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="4" />
        <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" />
      </svg>
    ),
  },
  cold: {
    id: 'cold',
    name: 'COLD',
    description: 'Archived knowledge, low-frequency',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    bgTint: 'rgba(59, 130, 246, 0.05)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1v16M1 9h16M4.8 4.8l8.4 8.4M13.2 4.8l-8.4 8.4" />
        <circle cx="9" cy="9" r="2" />
      </svg>
    ),
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  return n.toLocaleString()
}

function usagePercent(used: number, budget: number): number {
  if (budget === 0) return 0
  return Math.round((used / budget) * 100)
}

function calcTotalUsed(tierList: Tier[]): number {
  return tierList.reduce(
    (sum, tier) => sum + tier.slots.reduce((s, slot) => s + slot.tokensUsed, 0),
    0,
  )
}

function calcTotalBudget(tierList: Tier[]): number {
  return tierList.reduce(
    (sum, tier) => sum + tier.slots.reduce((s, slot) => s + slot.tokenBudget, 0),
    0,
  )
}

function tierUsed(tier: Tier): number {
  return tier.slots.reduce((s, slot) => s + slot.tokensUsed, 0)
}

function tierBudget(tier: Tier): number {
  return tier.slots.reduce((s, slot) => s + slot.tokenBudget, 0)
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({
  percent,
  color,
  height = 2,
}: {
  percent: number
  color: string
  height?: number
}) {
  return (
    <div
      className="w-full bg-[#252830] overflow-hidden"
      style={{ height }}
    >
      <motion.div
        className="h-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percent, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}

function SlotCard({ slot, color }: { slot: MemorySlot; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const pct = usagePercent(slot.tokensUsed, slot.tokenBudget)

  return (
    <motion.button
      type="button"
      onClick={() => setExpanded((prev) => !prev)}
      className="w-full text-left bg-[#0f1117] border border-[#252830] rounded-none p-3 cursor-pointer
                 hover:border-[#3a3f4b] transition-colors duration-150"
      layout
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-medium text-[#e2e4e9] uppercase tracking-wider truncate">
            {slot.label}
          </p>
          <span
            className="inline-block mt-1.5 pl-2 py-0.5 text-[10px] font-mono font-semibold leading-tight tracking-wide uppercase"
            style={{
              borderLeft: `2px solid ${color}`,
              color: '#7a7f8d',
            }}
          >
            {slot.pattern}
          </span>
        </div>

        {/* Expand toggle: + / - character */}
        <span className="shrink-0 font-mono text-sm text-[#484c58] mt-0.5 select-none">
          {expanded ? '\u2212' : '+'}
        </span>
      </div>

      {/* Token usage */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-[#7a7f8d]">
            {formatTokens(slot.tokensUsed)}{' '}
            <span className="text-[#484c58]">/</span>{' '}
            {formatTokens(slot.tokenBudget)}
          </span>
          <span
            className="text-[10px] font-mono font-semibold"
            style={{ color }}
          >
            {pct}%
          </span>
        </div>
        <ProgressBar percent={pct} color={color} height={2} />
      </div>

      {/* Last accessed */}
      <p className="mt-2 text-[10px] text-[#484c58] font-mono uppercase tracking-wider">
        last accessed {slot.lastAccessed}
      </p>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[#252830]">
              <p className="text-xs text-[#7a7f8d] font-mono leading-relaxed">
                {slot.details}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function TierColumn({ tier }: { tier: Tier }) {
  const used = tierUsed(tier)
  const budget = tierBudget(tier)
  const pct = usagePercent(used, budget)

  return (
    <div className="flex flex-col min-w-0">
      {/* Tier header */}
      <div className="p-3 border border-b-0 border-[#252830] bg-[#0f1117]">
        <div className="flex items-center gap-2 mb-2">
          {/* Small colored indicator square */}
          <span
            className="inline-block w-2.5 h-2.5 shrink-0"
            style={{ backgroundColor: tier.color }}
          />
          <h3
            className="font-mono text-sm font-bold tracking-wider uppercase"
            style={{ color: tier.color }}
          >
            {tier.name}
          </h3>
        </div>
        <p className="text-[10px] text-[#484c58] font-mono uppercase tracking-wider mb-3">
          {tier.description}
        </p>

        {/* Tier budget bar */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono text-[#7a7f8d]">
            {formatTokens(used)} / {formatTokens(budget)}
          </span>
          <span
            className="text-[10px] font-mono font-semibold"
            style={{ color: tier.color }}
          >
            {pct}%
          </span>
        </div>
        <ProgressBar percent={pct} color={tier.color} />
      </div>

      {/* Slot list */}
      <div className="flex flex-col gap-2 border border-t-0 border-[#252830] p-2 bg-[#080a0f] flex-1">
        {tier.slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} color={tier.color} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function MemoryInspector() {
  const { tierBreakdown: localBreakdown } = useMemory()
  const { breakdown: backendBreakdown } = useBackendTierBreakdown()

  // Use backend data when available, fall back to local engine
  const tierBreakdown = useMemo(() => {
    if (USE_BACKEND && backendBreakdown && backendBreakdown.total > 0) {
      return {
        hot: backendBreakdown.hot.map((e: any) => ({
          id: e.id,
          content: e.content,
          namespace: e.namespace,
          tier: e.tier,
          score: e.score,
          lastAccessedAt: Date.now(),
        })),
        warm: backendBreakdown.warm.map((e: any) => ({
          id: e.id,
          content: e.content,
          namespace: e.namespace,
          tier: e.tier,
          score: e.score,
          lastAccessedAt: Date.now(),
        })),
        cold: backendBreakdown.cold.map((e: any) => ({
          id: e.id,
          content: e.content,
          namespace: e.namespace,
          tier: e.tier,
          score: e.score,
          lastAccessedAt: Date.now(),
        })),
        total: backendBreakdown.total,
      }
    }
    return localBreakdown
  }, [localBreakdown, backendBreakdown])

  const tiers: Tier[] = useMemo(() => {
    const tierIds: TierId[] = ['hot', 'warm', 'cold']
    return tierIds.map((tierId) => ({
      ...TIER_META[tierId],
      slots: tierBreakdown[tierId].map((entry: any) => ({
        id: entry.id,
        label: entry.content.slice(0, 30),
        pattern: entry.namespace,
        tokensUsed: entry.content.length,
        tokenBudget: 4000,
        lastAccessed: entry.lastAccessedAt ? formatRelativeTime(entry.lastAccessedAt) : 'recently',
        details: entry.content,
      })),
    }))
  }, [tierBreakdown])

  const used = calcTotalUsed(tiers)
  const budget = calcTotalBudget(tiers)
  const pct = usagePercent(used, budget)

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-[#e2e4e9] font-mono">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="font-mono text-lg font-bold text-[#e2e4e9] uppercase tracking-wider">
            MEMORY INSPECTOR
          </h1>
          <p className="text-[10px] text-[#484c58] font-mono uppercase tracking-wider mt-0.5">
            AGENTDB TOKEN BUDGET VISUALIZER
          </p>
        </div>

        {/* Total token counter */}
        <div className="text-right">
          <p className="font-mono text-sm text-[#7a7f8d]">
            <span className="text-[#e2e4e9] font-semibold">
              {formatTokens(used)}
            </span>{' '}
            <span className="text-[#484c58]">/</span>{' '}
            <span className="text-[#484c58]">{formatTokens(budget)}</span>{' '}
            <span className="text-[#484c58] uppercase tracking-wider">tokens</span>
          </p>
          <div className="mt-1.5 w-48 ml-auto">
            <ProgressBar percent={pct} color="#3B82F6" />
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Three-Column Tier Grid                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 overflow-auto px-6">
        {tierBreakdown.total === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="font-mono text-sm uppercase tracking-wider text-[#484c58]">
                No memories stored
              </p>
              <p className="mt-2 font-mono text-xs text-[#3a3f4b]">
                Use Command Center or Integration Hub to store data.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {tiers.map((tier) => (
              <TierColumn key={tier.id} tier={tier} />
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom Section (pinned)                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-shrink-0 mx-6 mb-6 mt-4 bg-[#0f1117] border border-[#252830] rounded-none p-4">
        {/* Full-width overview bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#7a7f8d] uppercase tracking-wider font-medium">
              TOTAL MEMORY ALLOCATION
            </span>
            <span className="text-xs font-mono text-[#484c58] uppercase tracking-wider">
              {pct}% UTILIZED
            </span>
          </div>

          {/* Stacked bar showing each tier's contribution */}
          <div className="w-full overflow-hidden flex" style={{ height: '3px' }}>
            {tiers.map((tier) => {
              const tierPct = (tierUsed(tier) / budget) * 100
              return (
                <motion.div
                  key={tier.id}
                  className="h-full"
                  style={{ backgroundColor: tier.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tierPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            {tiers.map((tier) => (
              <div key={tier.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="text-[10px] font-mono text-[#484c58] uppercase tracking-wider">
                  {tier.name} {formatTokens(tierUsed(tier))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-[#252830]">
          <button
            type="button"
            className="px-4 py-2 rounded-sm border border-forge-cta text-forge-cta bg-transparent
                       font-mono text-xs font-semibold uppercase tracking-wider
                       hover:bg-forge-cta/10 transition-colors duration-150 cursor-pointer"
          >
            OPTIMIZE MEMORY
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-sm border border-[#252830] text-[#484c58] bg-transparent
                       font-mono text-xs font-semibold uppercase tracking-wider
                       hover:border-[#3a3f4b] hover:text-[#7a7f8d] transition-colors duration-150 cursor-pointer"
          >
            CLEAR COLD STORAGE
          </button>
        </div>
      </div>
    </div>
  )
}
