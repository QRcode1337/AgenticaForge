import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AGENTICA_CATALOG, AGENTICA_CATEGORIES } from '../../data/agentica-catalog.ts'
import type { AgenticaAgent } from '../../data/agentica-catalog.ts'
import { supabase } from '../../lib/supabase.ts'

interface AgentCatalogProps {
  onClose: () => void
  onImport: () => void
}

const ROLE_COLORS: Record<string, string> = {
  scout: '#3B82F6',
  worker: '#22C55E',
  coordinator: '#F59E0B',
  specialist: '#A855F7',
  guardian: '#EF4444',
}

export default function AgentCatalog({ onClose, onImport }: AgentCatalogProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)

  const filtered = AGENTICA_CATALOG.filter((agent) => {
    if (activeCategory && agent.category !== activeCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.description.toLowerCase().includes(q) ||
        agent.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleImport = useCallback(async (agent: AgenticaAgent) => {
    setImporting(agent.name)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.warn('[AgentCatalog] Not authenticated')
        return
      }

      await supabase.from('agents').insert({
        user_id: session.user.id,
        name: agent.name,
        role: agent.suggestedRole,
        system_prompt: agent.systemPrompt,
        model: 'claude-sonnet-4-5-20250929',
        tools: agent.tools,
        config: { source: 'agentica', category: agent.category },
      })

      onImport()
    } catch (err) {
      console.error('[AgentCatalog] Import failed:', err)
    } finally {
      setImporting(null)
    }
  }, [onImport])

  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="fixed left-0 top-0 z-40 flex h-full w-96 flex-col border-r border-[#252830] bg-[#0f1117]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252830] px-5 py-3">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[#e2e4e9]">
          AGENTICA CATALOG
        </h3>
        <button
          onClick={onClose}
          className="font-mono text-xs text-[#7a7f8d] hover:text-[#e2e4e9]"
        >
          ESC
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-[#252830] px-5 py-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 font-mono text-xs text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#252830] px-5 py-3">
        <button
          onClick={() => setActiveCategory(null)}
          className="border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
          style={{
            borderColor: !activeCategory ? '#F97316' : 'rgba(60, 56, 54, 0.5)',
            color: !activeCategory ? '#F97316' : '#7a7f8d',
            backgroundColor: !activeCategory ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
          }}
        >
          ALL ({AGENTICA_CATALOG.length})
        </button>
        {AGENTICA_CATEGORIES.map((cat) => {
          const count = AGENTICA_CATALOG.filter((a) => a.category === cat).length
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className="border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
              style={{
                borderColor: isActive ? '#F97316' : 'rgba(60, 56, 54, 0.5)',
                color: isActive ? '#F97316' : '#7a7f8d',
                backgroundColor: isActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
              }}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="space-y-2">
          {filtered.map((agent) => (
            <div
              key={agent.name}
              className="border border-[#252830] bg-[#080a0f] p-3"
              style={{ borderLeftWidth: '2px', borderLeftColor: agent.color }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 flex-shrink-0"
                      style={{ backgroundColor: agent.color }}
                    />
                    <h4 className="truncate font-mono text-xs font-semibold uppercase tracking-wider text-[#e2e4e9]">
                      {agent.name}
                    </h4>
                  </div>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-[#7a7f8d]">
                    {agent.description}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-block bg-[#1a1d27] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: '#F97316' }}
                >
                  {agent.category}
                </span>
                <span
                  className="inline-block bg-[#1a1d27] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: ROLE_COLORS[agent.suggestedRole] ?? '#7a7f8d' }}
                >
                  {agent.suggestedRole}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => void handleImport(agent)}
                  disabled={importing === agent.name}
                  className="border border-[#F97316] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#F97316] transition-colors hover:bg-[#F97316]/10 disabled:opacity-40"
                >
                  {importing === agent.name ? 'IMPORTING...' : 'IMPORT'}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-8 text-center font-mono text-xs text-[#484c58]">
              NO AGENTS MATCH FILTER
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#252830] px-5 py-3">
        <span className="font-mono text-[10px] text-[#484c58]">
          {filtered.length} OF {AGENTICA_CATALOG.length} AGENTS
        </span>
        <button
          onClick={onClose}
          className="border border-[#252830] px-3 py-1 font-mono text-xs uppercase tracking-wider text-[#7a7f8d] hover:bg-[#1a1d27]"
        >
          CLOSE
        </button>
      </div>
    </motion.div>
  )
}
