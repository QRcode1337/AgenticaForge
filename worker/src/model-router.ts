/**
 * ModelRouter Singleton — wraps agentic-flow/router with graceful fallback.
 * If the package isn't installed, getRouter() returns null and the executor
 * falls back to the legacy Anthropic/OpenAI SDK path.
 */

// Using 'unknown' since we dynamically import and the package may not exist
let routerInstance: unknown = null
let initAttempted = false
let initError: string | null = null

export async function getRouter(): Promise<unknown> {
  if (initAttempted) return routerInstance
  initAttempted = true

  try {
    // @ts-ignore -- agentic-flow is an optional peer; resolved at runtime
    const mod = await import('agentic-flow/router')
    const ModelRouter = (mod as { ModelRouter: new (config: Record<string, unknown>) => unknown }).ModelRouter

    // Auto-configure from env vars
    const config: Record<string, unknown> = {}
    if (process.env.ANTHROPIC_API_KEY) config.anthropic = { apiKey: process.env.ANTHROPIC_API_KEY }
    if (process.env.OPENROUTER_API_KEY) config.openrouter = { apiKey: process.env.OPENROUTER_API_KEY }
    if (process.env.GOOGLE_GEMINI_API_KEY) config.gemini = { apiKey: process.env.GOOGLE_GEMINI_API_KEY }
    if (process.env.OPENAI_API_KEY) config.openai = { apiKey: process.env.OPENAI_API_KEY }

    routerInstance = new ModelRouter(config)
    console.log('[model-router] Agentica ModelRouter initialized')
    return routerInstance
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err)
    console.log(`[model-router] agentic-flow not available (${initError}), using legacy SDK path`)
    return null
  }
}

export function getRouterMetrics(): { available: boolean; error: string | null } {
  return {
    available: routerInstance !== null,
    error: initError,
  }
}

export function getRouterConfig(): { providers: string[] } {
  const providers: string[] = []
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic')
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter')
  if (process.env.GOOGLE_GEMINI_API_KEY) providers.push('gemini')
  return { providers }
}
