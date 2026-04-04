import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemory, useBackendTierBreakdown } from '../../hooks/use-memory.ts'
import PanelHeader from '../shared/PanelHeader'
import EmptyState from '../shared/EmptyState'

// -- Feature flag --
const USE_BACKEND = true

// -- Memory Tags Persistence --
const TAGS_STORAGE_KEY = 'agentforge-memory-tags'

type TagMap = Record<string, string[]>

function loadTagMap(): TagMap {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveTagMap(tags: TagMap) {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
  } catch { /* quota exceeded */ }
}

function useMemoryTags() {
  const [tagMap, setTagMap] = useState<TagMap>(loadTagMap)

  useEffect(() => { saveTagMap(tagMap) }, [tagMap])

  const getTagsForEntry = useCallback(
    (id: string): string[] => tagMap[id] ?? [],
    [tagMap],
  )

  const addTag = useCallback((id: string, tag: string) => {
    const normalized = tag.trim().toLowerCase()
    if (!normalized) return
    setTagMap((prev) => {
      const existing = prev[id] ?? []
      if (existing.includes(normalized)) return prev
      return { ...prev, [id]: [...existing, normalized] }
    })
  }, [])

  const removeTag = useCallback((id: string, tag: string) => {
    const normalized = tag.trim().toLowerCase()
    setTagMap((prev) => {
      const existing = prev[id]
      if (!existing) return prev
      const updated = existing.filter((t) => t !== normalized)
      if (updated.length === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: updated }
    })
  }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    Object.values(tagMap).forEach((tags) => tags.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [tagMap])

  const filterByTags = useCallback(
    (tags: string[]): string[] => {
      const normalized = tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
      if (normalized.length === 0) return []
      return Object.entries(tagMap)
        .filter(([, entryTags]) => normalized.some((t) => entryTags.includes(t)))
        .map(([id]) => id)
    },
    [tagMap],
  )

  return { getTagsForEntry, addTag, removeTag, allTags, filterByTags }
}

// -- Types --

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

// -- Tier metadata --

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

// -- Helpers --

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

// -- Sub-components --

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
    <div className="w-full bg-[#252830] overflow-hidden" style={{ height }}>
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

function SlotCard({
  slot,
  color,
  tags,
  onAddTag,
  onRemoveTag,
}: {
  slot: MemorySlot
  color: string
  tags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const pct = usagePercent(slot.tokensUsed, slot.tokenBudget)

  return (
    <motion.div className="w-full text-left bg-[#0f1117] border border-[#252830] rounded-none p-3" layout>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left cursor-pointer"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-medium text-[#e2e4e9] uppercase tracking-wider truncate">
              {slot.label}
            </p>
            <span
              className="inline-block mt-1.5 pl-2 py-0.5 text-[10px] font-mono font-semibold leading-tight tracking-wide uppercase"
              style={{ borderLeft: `2px solid ${color}`, color: '#7a7f8d' }}
            >
              {slot.pattern}
            </span>
          </div>
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
            <span className="text-[10px] font-mono font-semibold" style={{ color }}>{pct}%</span>
          </div>
          <ProgressBar percent={pct} color={color} height={2} />
        </div>

        <p className="mt-2 text-[10px] text-[#484c58] font-mono uppercase tracking-wider">
          last accessed {slot.lastAccessed}
        </p>
      </button>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-[#1a1d25] text-[#7a7f8d] rounded font-mono"
          >
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveTag(tag) }}
              className="text-[#484c58] hover:text-red-400 transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="w-16 bg-transparent text-[10px] text-[#484c58] outline-none placeholder-[#2a2d35] font-mono"
          placeholder="+ tag"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onAddTag(e.currentTarget.value)
              e.currentTarget.value = ''
            }
          }}
        />
      </div>

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
              <p className="text-xs text-[#7a7f8d] font-mono leading-relaxed">{slot.details}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TierColumn({
  tier,
  getTagsForEntry,
  onAddTag,
  onRemoveTag,
}: {
  tier: Tier
  getTagsForEntry: (id: string) => string[]
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
}) {
  const used = tierUsed(tier)
  const budget = tierBudget(tier)
  const pct = usagePercent(used, budget)

  return (
    <div className="flex flex-col min-w-0">
      {/* Tier header */}
      <div className="p-3 border border-b-0 border-[#252830] bg-[#0f1117]">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ backgroundColor: tier.color }} />
          <h3 className="font-mono text-sm font-bold tracking-wider uppercase" style={{ color: tier.color }}>
            {tier.name}
          </h3>
        </div>
        <p className="text-[10px] text-[#484c58] font-mono uppercase tracking-wider mb-3">{tier.description}</p>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono text-[#7a7f8d]">
            {formatTokens(used)} / {formatTokens(budget)}
          </span>
          <span className="text-[10px] font-mono font-semibold" style={{ color: tier.color }}>{pct}%</span>
        </div>
        <ProgressBar percent={pct} color={tier.color} />
      </div>

      {/* Slot list */}
      <div className="flex flex-col gap-2 border border-t-0 border-[#252830] p-2 bg-[#080a0f] flex-1">
        {tier.slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            color={tier.color}
            tags={getTagsForEntry(slot.id)}
            onAddTag={(tag) => onAddTag(slot.id, tag)}
            onRemoveTag={(tag) => onRemoveTag(slot.id, tag)}
          />
        ))}
      </div>
    </div>
  )
}

// -- Tag Filter Bar --

function TagFilterBar({
  allTags,
  activeFilters,
  onToggleFilter,
}: {
  allTags: string[]
  activeFilters: string[]
  onToggleFilter: (tag: string) => void
}) {
  if (allTags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-6 py-2 border-b border-[#252830]">
      <span className="text-[10px] font-mono text-[#484c58] uppercase tracking-wider mr-2">TAGS:</span>
      {allTags.map((tag) => (
        <button
          key={tag}
          onClick={() => onToggleFilter(tag)}
          className={`px-2 py-0.5 text-[10px] font-mono rounded-sm border transition-colors ${
            activeFilters.includes(tag)
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-[#1a1d25] border-[#252830] text-[#484c58] hover:border-[#3a3f4b]'
          }`}
        >
          {tag}
        </button>
      ))}
      {activeFilters.length > 0 && (
        <button
          onClick={() => activeFilters.forEach(onToggleFilter)}
          className="px-2 py-0.5 text-[10px] font-mono text-[#484c58] hover:text-[#7a7f8d] transition-colors"
        >
          clear
        </button>
      )}
    </div>
  )
}

// -- Main Component --

export default function MemoryInspector() {
  const { tierBreakdown: localBreakdown } = useMemory()
  const { breakdown: backendBreakdown } = useBackendTierBreakdown()
  const { getTagsForEntry, addTag, removeTag, allTags, filterByTags } = useMemoryTags()
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])

  const tierBreakdown = useMemo(() => {
    if (USE_BACKEND && backendBreakdown && backendBreakdown.total > 0) {
      return {
        hot: backendBreakdown.hot.map((e: any) => ({
          id: e.id, content: e.content, namespace: e.namespace,
          tier: e.tier, score: e.score, lastAccessedAt: Date.now(),
        })),
        warm: backendBreakdown.warm.map((e: any) => ({
          id: e.id, content: e.content, namespace: e.namespace,
          tier: e.tier, score: e.score, lastAccessedAt: Date.now(),
        })),
        cold: backendBreakdown.cold.map((e: any) => ({
          id: e.id, content: e.content, namespace: e.namespace,
          tier: e.tier, score: e.score, lastAccessedAt: Date.now(),
        })),
        total: backendBreakdown.total,
      }
    }
    return localBreakdown
  }, [localBreakdown, backendBreakdown])

  // Get IDs matching active tag filters
  const tagFilteredIds = useMemo(() => {
    if (activeTagFilters.length === 0) return null // null = no filter
    return new Set(filterByTags(activeTagFilters))
  }, [activeTagFilters, filterByTags])

  const tiers: Tier[] = useMemo(() => {
    const tierIds: TierId[] = ['hot', 'warm', 'cold']
    return tierIds.map((tierId) => ({
      ...TIER_META[tierId],
      slots: tierBreakdown[tierId]
        .map((entry: any) => ({
          id: entry.id,
          label: entry.content.slice(0, 30),
          pattern: entry.namespace,
          tokensUsed: entry.content.length,
          tokenBudget: 4000,
          lastAccessed: entry.lastAccessedAt ? formatRelativeTime(entry.lastAccessedAt) : 'recently',
          details: entry.content,
        }))
        .filter((slot: MemorySlot) => {
          if (tagFilteredIds === null) return true
          return tagFilteredIds.has(slot.id)
        }),
    }))
  }, [tierBreakdown, tagFilteredIds])

  const used = calcTotalUsed(tiers)
  const budget = calcTotalBudget(tiers)
  const pct = usagePercent(used, budget)

  const toggleTagFilter = useCallback((tag: string) => {
    setActiveTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }, [])

  const totalMemories = tierBreakdown.hot.length + tierBreakdown.warm.length + tierBreakdown.cold.length

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-[#e2e4e9] font-mono">
      <PanelHeader panelNumber={2} title="Memory Inspector" stats={`${totalMemories} memories`} />
      {totalMemories === 0 ? (
        <EmptyState
          icon="◈"
          status="NO MEMORIES STORED"
          copy="Nothing in memory yet. Store your first entry."
          ctaLabel="+ STORE MEMORY"
          onCta={() => {}}
        />
      ) : (
        <>
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="font-mono text-lg font-bold text-[#e2e4e9] uppercase tracking-wider">
            MEMORY INSPECTOR
          </h1>
          <p className="text-[10px] text-[#484c58] font-mono uppercase tracking-wider mt-0.5">
            AGENTDB TOKEN BUDGET VISUALIZER
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-[#7a7f8d]">
            <span className="text-[#e2e4e9] font-semibold">{formatTokens(used)}</span>{' '}
            <span className="text-[#484c58]">/</span>{' '}
            <span className="text-[#484c58]">{formatTokens(budget)}</span>{' '}
            <span className="text-[#484c58] uppercase tracking-wider">tokens</span>
          </p>
          <div className="mt-1.5 w-48 ml-auto">
            <ProgressBar percent={pct} color="#3B82F6" />
          </div>
        </div>
      </div>

      {/* Tag filter bar */}
      <TagFilterBar
        allTags={allTags}
        activeFilters={activeTagFilters}
        onToggleFilter={toggleTagFilter}
      />

      {/* Three-Column Tier Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full py-4">
            {tiers.map((tier) => (
              <TierColumn
                key={tier.id}
                tier={tier}
                getTagsForEntry={getTagsForEntry}
                onAddTag={addTag}
                onRemoveTag={removeTag}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 mx-6 mb-6 mt-4 bg-[#0f1117] border border-[#252830] rounded-none p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#7a7f8d] uppercase tracking-wider font-medium">
              TOTAL MEMORY ALLOCATION
            </span>
            <span className="text-xs font-mono text-[#484c58] uppercase tracking-wider">
              {pct}% UTILIZED
            </span>
          </div>
          <div className="w-full overflow-hidden flex" style={{ height: '3px' }}>
            {tiers.map((tier) => {
              const tierPct = budget > 0 ? (tierUsed(tier) / budget) * 100 : 0
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
          <div className="flex items-center gap-4 mt-2">
            {tiers.map((tier) => (
              <div key={tier.id} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2" style={{ backgroundColor: tier.color }} />
                <span className="text-[10px] font-mono text-[#484c58] uppercase tracking-wider">
                  {tier.name} {formatTokens(tierUsed(tier))}
                </span>
              </div>
            ))}
          </div>
        </div>
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
        </>
      )}
    </div>
  )
}
