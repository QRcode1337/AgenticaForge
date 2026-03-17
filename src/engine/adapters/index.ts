// ── Adapter Interface ────────────────────────────────────────

export interface AdapterResult {
  ok: boolean
  info: Record<string, string>
  error?: string
}

export interface ServiceAdapter {
  id: string
  probe: (config: Record<string, string>) => Promise<AdapterResult>
  disconnect?: () => Promise<void>
  defaultConfig: Record<string, string>
}

// ── Helpers ──────────────────────────────────────────────────

function fail(error: string): AdapterResult {
  return { ok: false, info: {}, error }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

function formatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Connection failed'
  return msg.includes('abort') ? 'Connection timed out' : msg
}

// ── Ollama Adapter ───────────────────────────────────────────

export const ollamaAdapter: ServiceAdapter = {
  id: 'ollama',
  defaultConfig: {
    endpoint: 'localhost:11434',
    model: 'llama3.2',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      const res = await fetchWithTimeout('/ollama/api/tags')
      if (!res.ok) return fail(`HTTP ${res.status}`)
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      const models = data.models ?? []
      const modelNames = models.map((m) => m.name)
      return {
        ok: true,
        info: {
          version: 'running',
          models: modelNames.slice(0, 5).join(', ') || 'none',
          model: config.model ?? 'llama3.2',
          endpoint: config.endpoint ?? 'localhost:11434',
        },
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── HuggingFace Adapter ──────────────────────────────────────

export const huggingfaceAdapter: ServiceAdapter = {
  id: 'huggingface',
  defaultConfig: {
    token: '',
    model: 'BAAI/bge-large-en-v1.5',
    endpoint: 'api.huggingface.co',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      const model = config.model || 'BAAI/bge-large-en-v1.5'
      const headers: Record<string, string> = {}
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`
      }
      const res = await fetchWithTimeout(
        `/huggingface/api/models/${model}`,
        { headers },
      )
      if (!res.ok) return fail(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        id?: string
        pipeline_tag?: string
        downloads?: number
      }
      return {
        ok: true,
        info: {
          model: data.id ?? model,
          purpose: data.pipeline_tag ?? 'embeddings',
          downloads: String(data.downloads ?? 0),
          endpoint: 'api.huggingface.co',
        },
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── claude-flow Adapter ──────────────────────────────────────

export const claudeFlowAdapter: ServiceAdapter = {
  id: 'claude-flow',
  defaultConfig: {
    endpoint: 'localhost:3001',
    mode: 'hierarchical',
    maxAgents: '15',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      const res = await fetchWithTimeout('/claude-flow/health')
      if (!res.ok) return fail(`HTTP ${res.status}`)
      const data = (await res.json()) as { status?: string; version?: string }
      return {
        ok: true,
        info: {
          endpoint: config.endpoint ?? 'localhost:3001',
          mode: config.mode ?? 'hierarchical',
          maxAgents: config.maxAgents ?? '15',
          version: data.version ?? 'unknown',
        },
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── OpenClaw Adapter ─────────────────────────────────────────

export const openclawAdapter: ServiceAdapter = {
  id: 'openclaw',
  defaultConfig: {
    endpoint: 'localhost:18789',
    token: '',
    version: '',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      const headers: Record<string, string> = {}
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`
      }
      const res = await fetchWithTimeout('/openclaw/api/status', { headers })
      if (!res.ok) return fail(`HTTP ${res.status}`)
      const data = (await res.json()) as { version?: string; agents?: number }
      return {
        ok: true,
        info: {
          endpoint: config.endpoint ?? 'localhost:18789',
          version: data.version ?? 'unknown',
          agents: String(data.agents ?? 0),
        },
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── AgentDB Adapter ──────────────────────────────────────────

export const agentdbAdapter: ServiceAdapter = {
  id: 'agentdb',
  defaultConfig: {
    endpoint: 'IndexedDB (local)',
  },
  async probe(): Promise<AdapterResult> {
    try {
      if (typeof indexedDB === 'undefined') {
        return fail('IndexedDB not available')
      }
      return {
        ok: true,
        info: {
          endpoint: 'IndexedDB (local)',
          status: 'active',
        },
      }
    } catch {
      return fail('IndexedDB check failed')
    }
  },
}

// ── Anthropic Adapter ────────────────────────────────────────

export const anthropicAdapter: ServiceAdapter = {
  id: 'anthropic',
  defaultConfig: {
    apiKey: '',
    model: 'claude-sonnet-4-5-20250929',
    endpoint: 'api.anthropic.com',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      if (!config.apiKey) return fail('No API key configured')
      const res = await fetchWithTimeout('/anthropic/v1/models', {
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
      })
      if (!res.ok) return fail(`HTTP ${res.status}`)
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      const models = data.data ?? []
      return {
        ok: true,
        info: {
          model: config.model ?? 'claude-sonnet-4-5-20250929',
          models: models.slice(0, 5).map((m) => m.id).join(', ') || 'available',
          endpoint: 'api.anthropic.com',
        },
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── OpenAI Adapter ──────────────────────────────────────────

export const openaiAdapter: ServiceAdapter = {
  id: 'openai',
  defaultConfig: {
    apiKey: '',
    model: 'gpt-4o',
    endpoint: 'api.openai.com',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      if (!config.apiKey) return fail('No API key configured')
      const res = await fetchWithTimeout('/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      })
      if (!res.ok) return fail(`HTTP ${res.status}`)
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      const models = data.data ?? []
      return {
        ok: true,
        info: {
          model: config.model ?? 'gpt-4o',
          models: models.slice(0, 5).map((m) => m.id).join(', ') || 'available',
          endpoint: 'api.openai.com',
        },
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── Custom REST Adapter ──────────────────────────────────────

export const customRestAdapter: ServiceAdapter = {
  id: 'custom-rest',
  defaultConfig: {
    endpoint: '',
    method: 'GET',
    auth: '',
  },
  async probe(config): Promise<AdapterResult> {
    try {
      if (!config.endpoint) return fail('No endpoint configured')
      const headers: Record<string, string> = {}
      if (config.auth) {
        headers['Authorization'] = config.auth
      }
      const res = await fetchWithTimeout(config.endpoint, {
        method: config.method ?? 'GET',
        headers,
      })
      return {
        ok: res.ok,
        info: {
          status: `HTTP ${res.status}`,
          endpoint: config.endpoint,
          method: config.method ?? 'GET',
        },
        error: res.ok ? undefined : `HTTP ${res.status}`,
      }
    } catch (err) {
      return fail(formatError(err))
    }
  },
}

// ── Agentica Adapter ────────────────────────────────────────

export const agenticaAdapter: ServiceAdapter = {
  id: 'agentica',
  defaultConfig: {
    routingMode: 'auto',
    providers: '',
    agents: '66 available',
  },
  async probe(): Promise<AdapterResult> {
    try {
      // Query Supabase events table for recent worker_status that includes router info
      // Since we're in the browser, we check via the events table
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseKey) {
        return fail('Supabase not configured')
      }
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data } = await supabase
        .from('events')
        .select('data')
        .eq('type', 'worker_status')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!data?.data) {
        return {
          ok: true,
          info: {
            routingMode: 'auto',
            status: 'catalog-only',
            agents: '66 available',
            providers: 'Anthropic, OpenAI, OpenRouter, Gemini',
          },
        }
      }

      const workerData = data.data as Record<string, string>
      return {
        ok: true,
        info: {
          routingMode: workerData.routingMode ?? 'auto',
          providers: workerData.providers ?? 'checking...',
          agents: workerData.agents ?? '66 available',
        },
      }
    } catch {
      // If the event query fails, still show as available in catalog-only mode
      return {
        ok: true,
        info: {
          routingMode: 'auto',
          status: 'catalog-only',
          agents: '66 available',
          providers: 'Anthropic, OpenAI, OpenRouter, Gemini',
        },
      }
    }
  },
}

// ── Registry ─────────────────────────────────────────────────

export const ADAPTERS: Record<string, ServiceAdapter> = {
  ollama: ollamaAdapter,
  huggingface: huggingfaceAdapter,
  'claude-flow': claudeFlowAdapter,
  openclaw: openclawAdapter,
  agentdb: agentdbAdapter,
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  'custom-rest': customRestAdapter,
  agentica: agenticaAdapter,
}
