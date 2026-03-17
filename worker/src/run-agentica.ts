/**
 * Agentica Router Execution
 *
 * Runs an agent task through the ModelRouter, handling tool dispatch
 * in a loop matching the existing Anthropic execution pattern.
 */

import { createClient } from '@supabase/supabase-js'

// ── Types (duplicated from executor to avoid circular imports) ───

interface AgentRow {
  id: string
  user_id: string
  name: string
  role: string
  system_prompt: string | null
  model: string | null
  tools: string[] | null
  config: Record<string, unknown> | null
}

interface TaskRow {
  id: string
  swarm_run_id: string
  agent_id: string
  status: string
  phase: string
  input: { prompt: string; context?: string; tools?: string[]; dependencies?: string[] } | null
  output: unknown
  tokens_used: number | null
  attempts: number | null
  max_attempts: number | null
  last_error: string | null
}

interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

// ── Supabase + helpers (lightweight copies to avoid import cycles) ──

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function emitEvent(
  userId: string,
  type: string,
  message: string,
  extra: {
    swarmRunId?: string
    agentId?: string
    agentName?: string
    data?: Record<string, unknown>
  } = {},
) {
  const supabase = getSupabase()
  await supabase.from('events').insert({
    user_id: userId,
    type,
    swarm_run_id: extra.swarmRunId ?? null,
    agent_id: extra.agentId ?? null,
    agent_name: extra.agentName ?? null,
    message,
    data: extra.data ?? null,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })
}

async function storeMessage(
  taskId: string,
  agentId: string,
  userId: string,
  role: 'system' | 'user' | 'assistant' | 'tool',
  content: string | null,
  toolCalls?: unknown[],
  reasoningSummary?: string,
  tokens?: number,
) {
  const supabase = getSupabase()
  await supabase.from('messages').insert({
    task_id: taskId,
    agent_id: agentId,
    user_id: userId,
    role,
    content,
    tool_calls: toolCalls ?? null,
    reasoning_summary: reasoningSummary ?? null,
    tokens: tokens ?? null,
  })
}

// ── Tool dispatch (import from executor would create cycles) ──

// Dynamic import to reuse executor's dispatchTool at runtime
let _dispatchTool: ((userId: string, toolName: string, input: Record<string, unknown>) => Promise<string>) | null = null

async function getDispatchTool() {
  if (_dispatchTool) return _dispatchTool
  // We import the tool functions directly to avoid circular dependency
  const { webSearch } = await import('./tools/web-search.js')
  const { codeExec } = await import('./tools/code-exec.js')
  const { fileWrite } = await import('./tools/file-write.js')
  const { memoryStore, memorySearch } = await import('./tools/memory-ops.js')

  _dispatchTool = async (userId: string, toolName: string, input: Record<string, unknown>): Promise<string> => {
    switch (toolName) {
      case 'web_search':
        return JSON.stringify(await webSearch(input.query as string, (input.count as number | undefined) ?? 5))
      case 'code_exec':
        return JSON.stringify(await codeExec(input.code as string))
      case 'file_write':
        return JSON.stringify(await fileWrite(userId, input.name as string, input.content as string, (input.mime_type as string | undefined) ?? 'text/plain'))
      case 'memory_store':
        return JSON.stringify(await memoryStore(userId, input.content as string, input.namespace as string))
      case 'memory_search':
        return JSON.stringify(await memorySearch(userId, input.query as string, (input.limit as number | undefined) ?? 10))
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` })
    }
  }
  return _dispatchTool
}

// Tool definitions in Anthropic format (same as executor.ts TOOL_DEFINITIONS)
const TOOL_DEFINITIONS = [
  {
    name: 'web_search',
    description: 'Search the web for information. Returns titles, URLs, and snippets.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'number' } }, required: ['query'] },
  },
  {
    name: 'code_exec',
    description: 'Execute JavaScript code in a sandboxed environment.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
  },
  {
    name: 'file_write',
    description: 'Write a file to storage.',
    input_schema: { type: 'object', properties: { name: { type: 'string' }, content: { type: 'string' }, mime_type: { type: 'string' } }, required: ['name', 'content'] },
  },
  {
    name: 'memory_store',
    description: 'Store a memory for later retrieval.',
    input_schema: { type: 'object', properties: { content: { type: 'string' }, namespace: { type: 'string' } }, required: ['content', 'namespace'] },
  },
  {
    name: 'memory_search',
    description: 'Search stored memories by text query.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
  },
]

// ── Main execution function ──

export async function runViaRouter(
  router: unknown,
  agent: AgentRow,
  task: TaskRow,
  userId: string,
): Promise<{ response: string; toolResults: unknown[]; tokensUsed: number }> {
  const dispatchTool = await getDispatchTool()
  const toolResults: unknown[] = []
  let totalTokens = 0

  // Filter tools for this agent
  const agentTools = agent.tools?.length
    ? TOOL_DEFINITIONS.filter((t) => agent.tools!.includes(t.name))
    : TOOL_DEFINITIONS

  // Build initial messages
  const messages: Array<{ role: string; content: string | unknown[] }> = [
    { role: 'user', content: task.input?.prompt ?? 'No prompt provided.' },
  ]

  await storeMessage(task.id, agent.id, userId, 'user', task.input?.prompt ?? '')

  const MAX_TURNS = 10
  let finalText = ''

  // Type the router for .chat() calls
  const typedRouter = router as {
    chat: (opts: {
      model: string
      max_tokens: number
      system: string
      tools?: unknown[]
      messages: unknown[]
    }) => Promise<{
      content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>
      stop_reason: string
      usage?: { input_tokens?: number; output_tokens?: number }
    }>
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await typedRouter.chat({
      model: agent.model ?? 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: agent.system_prompt ?? 'You are a helpful AI agent.',
      tools: agentTools.length > 0 ? agentTools : undefined,
      messages,
    })

    const inputTokens = response.usage?.input_tokens ?? 0
    const outputTokens = response.usage?.output_tokens ?? 0
    totalTokens += inputTokens + outputTokens

    // Extract text and tool_use blocks
    const textParts: string[] = []
    const toolUseBlocks: ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text)
      } else if (block.type === 'tool_use' && block.id && block.name) {
        toolUseBlocks.push(block as ToolUseBlock)
      }
    }

    const assistantText = textParts.join('\n')

    await storeMessage(
      task.id, agent.id, userId, 'assistant',
      assistantText || null,
      toolUseBlocks.length > 0 ? toolUseBlocks : undefined,
      undefined,
      inputTokens + outputTokens,
    )

    // Add assistant turn to conversation
    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
      finalText = assistantText
      break
    }

    // Dispatch tools and collect results
    const toolResultBlocks: ToolResultBlock[] = []

    for (const toolUse of toolUseBlocks) {
      await emitEvent(
        userId, 'tool_call',
        `Agent ${agent.name} calling ${toolUse.name}`,
        {
          swarmRunId: task.swarm_run_id,
          agentId: agent.id,
          agentName: agent.name,
          data: { tool: toolUse.name, input: toolUse.input },
        },
      )

      let resultContent: string
      try {
        resultContent = await dispatchTool(userId, toolUse.name, toolUse.input)
      } catch (err) {
        resultContent = JSON.stringify({ error: String(err) })
      }

      toolResults.push({ tool: toolUse.name, input: toolUse.input, output: resultContent })
      toolResultBlocks.push({ type: 'tool_result', tool_use_id: toolUse.id, content: resultContent })

      await storeMessage(task.id, agent.id, userId, 'tool', resultContent)
    }

    messages.push({ role: 'user', content: toolResultBlocks })
  }

  return { response: finalText, toolResults, tokensUsed: totalTokens }
}
