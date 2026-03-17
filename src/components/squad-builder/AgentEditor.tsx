import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentEditorProps {
  agentId: string | null
  onClose: () => void
  onSave: () => void
}

type AgentRole = 'scout' | 'worker' | 'coordinator' | 'specialist' | 'guardian'
type AgentPhase = 'discovery' | 'analysis' | 'synthesis' | 'optimization'

const ROLE_OPTIONS: AgentRole[] = ['scout', 'worker', 'coordinator', 'specialist', 'guardian']
const MODEL_OPTIONS = ['claude-sonnet-4-5-20250929', 'gpt-4o', 'claude-haiku-4-5-20251001', 'ollama/llama3']
const TOOL_OPTIONS = ['web_search', 'code_exec', 'file_write', 'memory_ops'] as const
const PHASE_OPTIONS: AgentPhase[] = ['discovery', 'analysis', 'synthesis', 'optimization']

interface AgentFormData {
  name: string
  role: AgentRole
  systemPrompt: string
  model: string
  tools: string[]
  phase: AgentPhase
}

const DEFAULT_FORM: AgentFormData = {
  name: '',
  role: 'worker',
  systemPrompt: '',
  model: 'claude-sonnet-4-5-20250929',
  tools: [],
  phase: 'discovery',
}

// ---------------------------------------------------------------------------
// AgentEditor Component
// ---------------------------------------------------------------------------

export default function AgentEditor({ agentId, onClose, onSave }: AgentEditorProps) {
  const [form, setForm] = useState<AgentFormData>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Fetch existing agent data when agentId is provided
  useEffect(() => {
    if (!agentId) {
      setForm(DEFAULT_FORM)
      return
    }

    let cancelled = false
    setFetching(true)

    supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        setFetching(false)
        if (error || !data) return
        setForm({
          name: data.name ?? '',
          role: data.role ?? 'worker',
          systemPrompt: data.system_prompt ?? '',
          model: data.model ?? 'claude-sonnet-4-5-20250929',
          tools: data.tools ?? [],
          phase: data.phase ?? 'discovery',
        })
      })

    return () => { cancelled = true }
  }, [agentId])

  const handleChange = useCallback(
    (field: keyof AgentFormData, value: string | string[]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const handleToolToggle = useCallback((tool: string) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }))
  }, [])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const payload = {
        name: form.name,
        role: form.role,
        system_prompt: form.systemPrompt,
        model: form.model,
        tools: form.tools,
        phase: form.phase,
        user_id: session.user.id,
      }

      if (agentId) {
        await supabase.from('agents').update(payload).eq('id', agentId)
      } else {
        await supabase.from('agents').insert(payload)
      }
      onSave()
    } finally {
      setLoading(false)
    }
  }, [agentId, form, onSave])

  const handleDelete = useCallback(async () => {
    if (!agentId) return
    if (!window.confirm('Delete this agent? This action cannot be undone.')) return

    setLoading(true)
    try {
      await supabase.from('agents').delete().eq('id', agentId)
      onClose()
    } finally {
      setLoading(false)
    }
  }, [agentId, onClose])

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l border-[#252830] bg-[#0f1117]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252830] px-5 py-3">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[#e2e4e9]">
          {agentId ? 'EDIT AGENT' : 'NEW AGENT'}
        </h3>
        <button
          onClick={onClose}
          className="font-mono text-xs text-[#7a7f8d] hover:text-[#e2e4e9]"
        >
          ESC
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {fetching ? (
          <p className="font-mono text-xs text-[#484c58]">LOADING...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
                NAME
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 font-mono text-xs text-[#e2e4e9] outline-none focus:border-forge-accent"
                placeholder="Agent name..."
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
                ROLE
              </label>
              <select
                value={form.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full appearance-none border border-[#252830] bg-[#080a0f] px-3 py-2 font-mono text-xs uppercase text-[#e2e4e9] outline-none focus:border-forge-accent"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* System Prompt */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
                SYSTEM PROMPT
              </label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                rows={4}
                className="w-full resize-y border border-[#252830] bg-[#080a0f] px-3 py-2 font-mono text-xs text-[#e2e4e9] outline-none focus:border-forge-accent"
                style={{ minHeight: '100px' }}
                placeholder="Enter system prompt..."
              />
            </div>

            {/* Model */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
                MODEL
              </label>
              <select
                value={form.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full appearance-none border border-[#252830] bg-[#080a0f] px-3 py-2 font-mono text-xs text-[#e2e4e9] outline-none focus:border-forge-accent"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Tools */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
                TOOLS
              </label>
              <div className="flex flex-col gap-2">
                {TOOL_OPTIONS.map((tool) => (
                  <label key={tool} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.tools.includes(tool)}
                      onChange={() => handleToolToggle(tool)}
                      className="accent-forge-cta"
                    />
                    <span className="font-mono text-xs text-[#e2e4e9]">
                      {tool}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Phase */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#484c58]">
                PHASE
              </label>
              <select
                value={form.phase}
                onChange={(e) => handleChange('phase', e.target.value)}
                className="w-full appearance-none border border-[#252830] bg-[#080a0f] px-3 py-2 font-mono text-xs uppercase text-[#e2e4e9] outline-none focus:border-forge-accent"
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex items-center gap-2 border-t border-[#252830] px-5 py-3">
        <button
          onClick={handleSave}
          disabled={loading || !form.name.trim()}
          className="border border-forge-cta px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-forge-cta hover:bg-forge-cta/10 disabled:opacity-40"
        >
          {loading ? 'SAVING...' : 'SAVE'}
        </button>
        {agentId && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="border border-red-500/50 px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-red-400 hover:bg-red-500/10 disabled:opacity-40"
          >
            DELETE
          </button>
        )}
        <button
          onClick={onClose}
          className="border border-[#252830] px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-[#7a7f8d] hover:bg-[#1a1d27]"
        >
          CANCEL
        </button>
      </div>
    </motion.div>
  )
}
