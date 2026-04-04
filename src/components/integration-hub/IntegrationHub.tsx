import { useState, useCallback } from 'react'
import type { Integration } from '../../types'
import type { SearchResult } from '../../engine/types.ts'
import { useMemory } from '../../hooks/use-memory.ts'
import { useIntegrations } from '../../hooks/use-integrations.ts'
import type { IntegrationState } from '../../engine/integration-manager.ts'
import { seed } from '../../engine/seed-data.ts'
import ConfigModal from './ConfigModal.tsx'
import AddIntegrationModal from './AddIntegrationModal.tsx'
import EntryList from './EntryList.tsx'
import BulkActions from './BulkActions.tsx'
import PanelHeader from '../shared/PanelHeader'
import EmptyState from '../shared/EmptyState'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_BORDER_COLORS: Record<Integration['type'], string> = {
  framework:     'border-l-[#3B82F6]',
  orchestration: 'border-l-[#22C55E]',
  memory:        'border-l-[#A855F7]',
  model:         'border-l-[#F59E0B]',
}

const TYPE_TEXT_COLORS: Record<Integration['type'], string> = {
  framework:     'text-[#3B82F6]',
  orchestration: 'text-[#22C55E]',
  memory:        'text-[#A855F7]',
  model:         'text-[#F59E0B]',
}

const TYPE_LABELS: Record<Integration['type'], string> = {
  framework:     'FRAMEWORK',
  orchestration: 'ORCHESTRATION',
  memory:        'MEMORY',
  model:         'MODEL',
}

const ICON_LETTERS: Record<string, string> = {
  OpenClaw:      'OC',
  'claude-flow': 'CF',
  AgentDB:       'DB',
  Ollama:        'OL',
  'Custom REST':  'CR',
  HuggingFace:   'HF',
  Anthropic:     'AN',
  OpenAI:        'OA',
  Agentica:      'AF',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatConfigKey(key: string): string {
  return key
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')
}

function getDescription(name: string): string {
  const descriptions: Record<string, string> = {
    OpenClaw:      'Agent framework for autonomous task execution',
    'claude-flow': 'Multi-agent orchestration and coordination layer',
    AgentDB:       'Persistent memory patterns and vector storage',
    Ollama:        'Local LLM inference server',
    'Custom REST':  'Custom REST API integration endpoint',
    HuggingFace:   'Model hub for embeddings and fine-tuning',
    Anthropic:     'Claude API for inference and reasoning',
    OpenAI:        'GPT models for completion and embeddings',
    Agentica:      'Multi-provider LLM router with cost optimization and 66 agent templates',
  }
  return descriptions[name] ?? 'External service integration'
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status, probing }: { status: Integration['status']; probing: boolean }) {
  if (probing) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#F59E0B]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse bg-[#F59E0B]" />
        PROBING...
      </span>
    )
  }

  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#22C55E]">
        <span className="inline-block h-1.5 w-1.5 bg-[#22C55E]" />
        CONNECTED
      </span>
    )
  }

  if (status === 'configuring') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#F59E0B]">
        CONFIGURING...
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#EF4444]">
        <span className="inline-block h-1.5 w-1.5 bg-[#EF4444]" />
        ERROR
      </span>
    )
  }

  // disconnected
  return (
    <span className="inline-flex items-center font-mono text-[11px] uppercase tracking-wider text-[#484c58]">
      DISCONNECTED
    </span>
  )
}

// ---------------------------------------------------------------------------
// IntegrationCard
// ---------------------------------------------------------------------------

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  integration: IntegrationState
  onConnect: (id: string) => void
  onDisconnect: (id: string) => void
  onConfigure: (integration: IntegrationState) => void
}) {
  const { name, type, status, config, probing, error } = integration
  const iconLetters = ICON_LETTERS[name] ?? name.slice(0, 2).toUpperCase()
  const description = getDescription(name)

  return (
    <div
      className={`flex flex-col rounded-none border border-[#252830] bg-[#0f1117] ${TYPE_BORDER_COLORS[type]} border-l-2`}
    >
      <div className="p-4">
        {/* Top row: icon, name, badge */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[#1a1d27] font-mono text-sm font-bold ${TYPE_TEXT_COLORS[type]}`}
          >
            {iconLetters}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-mono text-sm font-semibold uppercase tracking-wider text-[#e2e4e9]">
                {name}
              </h3>
              <StatusBadge status={status} probing={probing} />
            </div>
            <p className="mt-0.5 font-mono text-xs text-[#7a7f8d]">{description}</p>
          </div>
        </div>

        {/* Type label */}
        <span
          className={`mt-3 inline-block rounded-none bg-[#1a1d27] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${TYPE_TEXT_COLORS[type]}`}
        >
          {TYPE_LABELS[type]}
        </span>

        {/* Error message */}
        {status === 'error' && error && (
          <div className="mt-2 border-l-2 border-[#EF4444] bg-[#080a0f] px-3 py-1.5 font-mono text-[11px] text-[#EF4444]">
            {error}
          </div>
        )}

        {/* Config block */}
        <div className="mt-3 space-y-1">
          {Object.entries(config).map(([key, value]) => (
            <div
              key={key}
              className="border-l-2 border-[#252830] bg-[#080a0f] px-3 py-1 font-mono text-[11px]"
            >
              <span className="uppercase text-[#484c58]">{formatConfigKey(key)}</span>
              <span className="text-[#484c58]">: </span>
              <span className="text-[#e2e4e9]">{value}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-2 border-t border-[#252830] pt-3">
          {status === 'connected' && (
            <>
              <button
                onClick={() => onDisconnect(integration.id)}
                disabled={probing}
                className="border border-[#EF4444] bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#EF4444] transition-colors hover:bg-[#EF4444]/10 disabled:opacity-50"
              >
                DISCONNECT
              </button>
              <button
                onClick={() => onConfigure(integration)}
                className="border border-[#252830] bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#7a7f8d] transition-colors hover:bg-[#1a1d27]"
              >
                CONFIGURE
              </button>
            </>
          )}
          {status === 'disconnected' && (
            <>
              <button
                onClick={() => onConnect(integration.id)}
                disabled={probing}
                className="border border-forge-cta bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-forge-cta transition-colors hover:bg-forge-cta/10 disabled:opacity-50"
              >
                CONNECT
              </button>
              <button
                onClick={() => onConfigure(integration)}
                className="border border-[#252830] bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#7a7f8d] transition-colors hover:bg-[#1a1d27]"
              >
                CONFIGURE
              </button>
            </>
          )}
          {status === 'configuring' && (
            <>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#F59E0B]">
                AWAITING CONFIG...
              </span>
              <div className="flex-1" />
              <button
                onClick={() => onConfigure(integration)}
                className="border border-[#F59E0B] bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10"
              >
                SAVE CONFIG
              </button>
            </>
          )}
          {status === 'error' && (
            <>
              <button
                onClick={() => onConnect(integration.id)}
                disabled={probing}
                className="border border-[#EF4444] bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#EF4444] transition-colors hover:bg-[#EF4444]/10 disabled:opacity-50"
              >
                RETRY
              </button>
              <button
                onClick={() => onConfigure(integration)}
                className="border border-[#252830] bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#7a7f8d] transition-colors hover:bg-[#1a1d27]"
              >
                CONFIGURE
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HealthBar
// ---------------------------------------------------------------------------

function HealthBar({ integrations }: { integrations: IntegrationState[] }) {
  const total = integrations.length
  const connected = integrations.filter((i) => i.status === 'connected').length
  const configuring = integrations.filter((i) => i.status === 'configuring').length
  const errored = integrations.filter((i) => i.status === 'error').length
  const disconnected = integrations.filter((i) => i.status === 'disconnected').length

  const segments: { count: number; color: string }[] = [
    { count: connected, color: 'bg-[#22C55E]' },
    { count: configuring, color: 'bg-[#F59E0B]' },
    { count: errored, color: 'bg-[#EF4444]' },
    { count: disconnected, color: 'bg-[#1a1d27]' },
  ]

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-wider text-[#e2e4e9]">
        <span className="text-[#22C55E]">{connected}</span>
        <span className="text-[#484c58]">/{total}</span>
        <span className="ml-1.5 text-[#7a7f8d]">CONNECTED</span>
      </span>

      <div className="flex h-0.5 flex-1 overflow-hidden rounded-none bg-[#1a1d27]">
        {segments.map((seg, idx) =>
          seg.count > 0 ? (
            <div
              key={idx}
              className={`${seg.color} transition-all duration-500`}
              style={{ width: `${(seg.count / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MemoryTestPanel — Store entries + search the engine
// ---------------------------------------------------------------------------

const NAMESPACE_OPTIONS = [
  'project:default',
  'project:agentforge',
  'session:test',
  'agent:decisions',
  'agent:tools',
  'knowledge:base',
]

const TYPE_OPTIONS = [
  'observation',
  'decision',
  'tool_result',
  'pattern',
  'error_log',
  'reward_signal',
]

function MemoryTestPanel({
  onStore,
  onSearch,
}: {
  onStore: (content: string, namespace: string, metadata: Record<string, string>) => void
  onSearch: (query: string) => SearchResult[]
}) {
  const [content, setContent] = useState('')
  const [namespace, setNamespace] = useState(NAMESPACE_OPTIONS[0])
  const [entryType, setEntryType] = useState(TYPE_OPTIONS[0])
  const [tags, setTags] = useState('')
  const [storeCount, setStoreCount] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const handleStore = () => {
    if (!content.trim()) return
    const meta: Record<string, string> = { type: entryType }
    if (tags.trim()) meta.tags = tags.trim()
    onStore(content.trim(), namespace, meta)
    setStoreCount((c) => c + 1)
    setContent('')
    setTags('')
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    const results = onSearch(searchQuery.trim())
    setSearchResults(results)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      action()
    }
  }

  return (
    <div className="space-y-4">
      {/* STORE SECTION */}
      <div className="border border-[#252830] bg-[#0f1117] p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 bg-[#22C55E]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
            STORE MEMORY
          </span>
          {storeCount > 0 && (
            <span className="text-[10px] text-[#484c58]">
              ({storeCount} stored this session)
            </span>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, handleStore)}
          placeholder="Enter memory content..."
          rows={2}
          className="mb-2 w-full border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
        />

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[9px] uppercase tracking-wider text-[#484c58]">
              NAMESPACE
            </label>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-full border border-[#252830] bg-[#080a0f] px-2 py-1.5 text-[11px] text-[#e2e4e9] outline-none focus:border-forge-accent"
            >
              {NAMESPACE_OPTIONS.map((ns) => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[9px] uppercase tracking-wider text-[#484c58]">
              TYPE
            </label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="w-full border border-[#252830] bg-[#080a0f] px-2 py-1.5 text-[11px] text-[#e2e4e9] outline-none focus:border-forge-accent"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[9px] uppercase tracking-wider text-[#484c58]">
              TAGS
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma,separated"
              className="w-full border border-[#252830] bg-[#080a0f] px-2 py-1.5 text-[11px] text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
            />
          </div>
        </div>

        <button
          onClick={handleStore}
          disabled={!content.trim()}
          className="border border-[#22C55E] bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-[#22C55E] transition-colors hover:bg-[#22C55E]/10 disabled:opacity-30"
        >
          STORE ENTRY
        </button>
      </div>

      {/* SEARCH SECTION */}
      <div className="border border-[#252830] bg-[#0f1117] p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 bg-[#A855F7]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
            SEARCH MEMORY
          </span>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleSearch)}
            placeholder="Enter search query..."
            className="flex-1 border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="border border-[#A855F7] bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-[#A855F7] transition-colors hover:bg-[#A855F7]/10 disabled:opacity-30"
          >
            SEARCH
          </button>
        </div>

        {/* Results */}
        {searchResults.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase tracking-wider text-[#484c58]">
              {searchResults.length} RESULT{searchResults.length !== 1 ? 'S' : ''}
            </span>
            {searchResults.map((r) => (
              <div
                key={r.entry.id}
                className="border-l-2 border-[#A855F7] bg-[#080a0f] px-3 py-2"
              >
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-[#A855F7]">
                    {(r.finalScore * 100).toFixed(0)}%
                  </span>
                  <span className="text-[#484c58]">{r.entry.namespace}</span>
                  <span className="text-[#484c58]">{r.entry.tier.toUpperCase()}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#e2e4e9]">
                  {r.entry.content}
                </p>
                {r.entry.metadata.type && (
                  <span className="mt-1 inline-block bg-[#1a1d27] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#7a7f8d]">
                    {r.entry.metadata.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IntegrationHub (main component)
// ---------------------------------------------------------------------------

export default function IntegrationHub() {
  const { stats, store, search, engine } = useMemory()
  const { integrations, connect, disconnect, updateConfig } = useIntegrations()
  const [configTarget, setConfigTarget] = useState<IntegrationState | null>(null)
  const [activeTab, setActiveTab] = useState<'services' | 'test'>('services')
  const [showAddModal, setShowAddModal] = useState(false)
  const [, setRefreshKey] = useState(0)
  const forceRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Overlay live engine stats onto the AgentDB card at render time
  const liveIntegrations = integrations.map((i) => {
    if (i.id !== 'agentdb') return i
    return {
      ...i,
      config: {
        ...i.config,
        endpoint: 'IndexedDB (local)',
        memoryTiers: `${stats.tierBreakdown.hot}H/${stats.tierBreakdown.warm}W/${stats.tierBreakdown.cold}C`,
        entries: `${stats.entryCount} entries`,
      },
    }
  })

  const handleConnect = (id: string) => {
    void connect(id)
  }

  const handleDisconnect = (id: string) => {
    void disconnect(id)
  }

  const handleConfigure = (integration: IntegrationState) => {
    setConfigTarget(integration)
  }

  const handleConfigSave = (config: Record<string, string>) => {
    if (!configTarget) return
    void updateConfig(configTarget.id, config).then(() => {
      void connect(configTarget.id)
    })
    setConfigTarget(null)
  }

  // Last probe timestamp from the most recently probed integration
  const lastProbe = integrations.reduce((latest, i) => Math.max(latest, i.lastProbe), 0)
  const lastSyncTime = lastProbe > 0
    ? new Date(lastProbe).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '--:--:--'

  const handleStoreMemory = useCallback(
    (content: string, namespace: string, metadata: Record<string, string>) => {
      store(content, namespace, metadata)
    },
    [store],
  )

  const handleSearchMemory = useCallback(
    (query: string): SearchResult[] => {
      return search(query, { limit: 10 })
    },
    [search],
  )

  const handleSeed = useCallback(() => {
    seed(engine)
    forceRefresh()
  }, [engine, forceRefresh])

  const handleClearAll = useCallback(() => {
    const entries = engine.getEntries()
    for (const entry of entries) {
      engine.delete(entry.id)
    }
    forceRefresh()
  }, [engine, forceRefresh])

  const handleExport = useCallback(() => {
    const entries = engine.getEntries()
    const json = JSON.stringify(entries, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentforge-memory-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [engine])

  const handleDeleteEntry = useCallback(
    (id: string) => {
      engine.delete(id)
      forceRefresh()
    },
    [engine, forceRefresh],
  )

  const handleAddIntegration = useCallback(
    (info: { name: string; endpoint: string; method: string; auth: string }) => {
      // Save to localStorage
      const key = 'agentforge-custom-integrations'
      const existing: Array<typeof info> = JSON.parse(localStorage.getItem(key) ?? '[]')
      existing.push(info)
      localStorage.setItem(key, JSON.stringify(existing))
      setShowAddModal(false)
    },
    [],
  )

  const entries = engine.getEntries()

  return (
    <div className="flex h-full w-full flex-col bg-[#080a0f] font-mono">
      <PanelHeader panelNumber={6} title="Integration Hub" stats={`${liveIntegrations.filter(i => i.status === 'connected').length} connected`} />
      {liveIntegrations.length === 0 ? (
        <EmptyState
          icon="◎"
          status="NO INTEGRATIONS"
          copy="No services connected. Add your first integration."
          ctaLabel="+ ADD INTEGRATION"
          onCta={() => setShowAddModal(true)}
        />
      ) : (
        <>
      {/* ---- Header ---- */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-[#252830] bg-[#0f1117] px-5 py-3">
        <div className="flex-1">
          <h2 className="font-mono text-lg font-semibold uppercase tracking-wider text-[#e2e4e9]">
            INTEGRATION HUB
          </h2>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-[#484c58]">
            FRAMEWORK CONNECTIONS AND SERVICE ENDPOINTS
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-sm border border-forge-accent bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wider text-forge-accent transition-colors hover:bg-forge-accent/10"
        >
          + ADD INTEGRATION
        </button>
      </header>

      {/* ---- Tab bar ---- */}
      <div
        className="flex flex-shrink-0 items-center gap-1 px-5 py-2"
        style={{ borderBottom: '1px solid #252830' }}
      >
        <button
          onClick={() => setActiveTab('services')}
          className="px-3 py-1 text-[11px] uppercase tracking-wider transition-colors"
          style={{
            color: activeTab === 'services' ? '#e2e4e9' : '#484c58',
            borderBottom: activeTab === 'services' ? '1px solid #22C55E' : '1px solid transparent',
          }}
        >
          SERVICES
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className="px-3 py-1 text-[11px] uppercase tracking-wider transition-colors"
          style={{
            color: activeTab === 'test' ? '#e2e4e9' : '#484c58',
            borderBottom: activeTab === 'test' ? '1px solid #A855F7' : '1px solid transparent',
          }}
        >
          TEST DATA
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-[#484c58]">
          {stats.entryCount} memories stored
        </span>
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {liveIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onConfigure={handleConfigure}
              />
            ))}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-4">
            <MemoryTestPanel
              onStore={handleStoreMemory}
              onSearch={handleSearchMemory}
            />
            <BulkActions
              onSeed={handleSeed}
              onClearAll={handleClearAll}
              onExport={handleExport}
              entryCount={entries.length}
            />
            <EntryList
              entries={entries}
              onDelete={handleDeleteEntry}
            />
          </div>
        )}
      </div>

      {/* ---- Bottom Health Overview ---- */}
      <footer className="flex flex-shrink-0 items-center gap-4 border-t border-[#252830] bg-[#0f1117] px-5 py-3">
        <div className="flex-1">
          <HealthBar integrations={liveIntegrations} />
        </div>

        <span className="font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
          LAST SYNC: {lastSyncTime}
        </span>
      </footer>

      {/* ---- Config Modal ---- */}
      {configTarget && (
        <ConfigModal
          integration={configTarget}
          onSave={handleConfigSave}
          onClose={() => setConfigTarget(null)}
        />
      )}

      {/* ---- Add Integration Modal ---- */}
      {showAddModal && (
        <AddIntegrationModal
          onAdd={handleAddIntegration}
          onClose={() => setShowAddModal(false)}
        />
      )}
        </>
      )}
    </div>
  )
}
