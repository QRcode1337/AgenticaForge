/**
 * Agent Task Executor
 *
 * Loads an agent task from the queue, runs the agent's LLM loop
 * (including tool calls), stores messages, and updates status.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { webSearch } from './tools/web-search.js'
import { codeExec } from './tools/code-exec.js'
import { fileWrite } from './tools/file-write.js'
import { memoryStore, memorySearch } from './tools/memory-ops.js'
import { getRouter } from './model-router.js'
import { runViaRouter } from './run-agentica.js'

// ── Types ────────────────────────────────────────────────────────

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

interface CredentialRow {
  encrypted_key: string | null
}

// Anthropic message types
interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock

interface AnthropicToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[] | AnthropicToolResultBlock[]
}

// ── Helpers ──────────────────────────────────────────────────────

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

// ── Tool dispatch ────────────────────────────────────────────────

const TOOL_DEFINITIONS: Anthropic.Messages.Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web for information. Returns titles, URLs, and snippets.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'code_exec',
    description: 'Execute JavaScript code in a sandboxed environment. Returns stdout, stderr, and exit code.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'JavaScript code to execute' },
      },
      required: ['code'],
    },
  },
  {
    name: 'file_write',
    description: 'Write a file to storage. Returns the storage path and size.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'File name' },
        content: { type: 'string', description: 'File content' },
        mime_type: { type: 'string', description: 'MIME type (default text/plain)' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'memory_store',
    description: 'Store a memory for later retrieval. Memories are embedded asynchronously.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Memory content to store' },
        namespace: { type: 'string', description: 'Namespace for grouping memories' },
      },
      required: ['content', 'namespace'],
    },
  },
  {
    name: 'memory_search',
    description: 'Search stored memories by text query.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
]

async function dispatchTool(
  userId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case 'web_search': {
      const results = await webSearch(
        input.query as string,
        (input.count as number | undefined) ?? 5,
      )
      return JSON.stringify(results)
    }
    case 'code_exec': {
      const result = await codeExec(input.code as string)
      return JSON.stringify(result)
    }
    case 'file_write': {
      const result = await fileWrite(
        userId,
        input.name as string,
        input.content as string,
        (input.mime_type as string | undefined) ?? 'text/plain',
      )
      return JSON.stringify(result)
    }
    case 'memory_store': {
      const result = await memoryStore(
        userId,
        input.content as string,
        input.namespace as string,
      )
      return JSON.stringify(result)
    }
    case 'memory_search': {
      const results = await memorySearch(
        userId,
        input.query as string,
        (input.limit as number | undefined) ?? 10,
      )
      return JSON.stringify(results)
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}

function getToolsForAgent(agent: AgentRow): Anthropic.Messages.Tool[] {
  if (!agent.tools || agent.tools.length === 0) return TOOL_DEFINITIONS
  return TOOL_DEFINITIONS.filter((t) => agent.tools!.includes(t.name))
}

// ── Anthropic execution ──────────────────────────────────────────

async function runAnthropic(
  apiKey: string,
  agent: AgentRow,
  task: TaskRow,
): Promise<{ response: string; toolResults: unknown[]; tokensUsed: number }> {
  const anthropic = new Anthropic({ apiKey })
  const tools = getToolsForAgent(agent)
  const toolResults: unknown[] = []
  let totalTokens = 0

  const conversationMessages: AnthropicMessage[] = [
    { role: 'user', content: task.input?.prompt ?? 'No prompt provided.' },
  ]

  // Store user message
  await storeMessage(task.id, agent.id, agent.user_id, 'user', task.input?.prompt ?? '')

  const MAX_TURNS = 10
  let finalText = ''

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: agent.model ?? 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: agent.system_prompt ?? 'You are a helpful AI agent.',
      tools: tools.length > 0 ? tools : undefined,
      messages: conversationMessages,
    })

    totalTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Extract text and tool_use blocks
    const textParts: string[] = []
    const toolUseBlocks: AnthropicToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block as AnthropicToolUseBlock)
      }
    }

    const assistantText = textParts.join('\n')

    // Store assistant message
    await storeMessage(
      task.id,
      agent.id,
      agent.user_id,
      'assistant',
      assistantText || null,
      toolUseBlocks.length > 0 ? toolUseBlocks : undefined,
      undefined,
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    )

    // Add assistant turn to conversation
    conversationMessages.push({ role: 'assistant', content: response.content as AnthropicContentBlock[] })

    if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
      finalText = assistantText
      break
    }

    // Dispatch tools and collect results
    const toolResultBlocks: AnthropicToolResultBlock[] = []

    for (const toolUse of toolUseBlocks) {
      await emitEvent(
        agent.user_id,
        'tool_call',
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
        resultContent = await dispatchTool(
          agent.user_id,
          toolUse.name,
          toolUse.input,
        )
      } catch (err) {
        resultContent = JSON.stringify({ error: String(err) })
      }

      toolResults.push({ tool: toolUse.name, input: toolUse.input, output: resultContent })
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: resultContent,
      })

      // Store tool result message
      await storeMessage(task.id, agent.id, agent.user_id, 'tool', resultContent)
    }

    conversationMessages.push({ role: 'user', content: toolResultBlocks })
  }

  return { response: finalText, toolResults, tokensUsed: totalTokens }
}

// ── OpenAI execution ─────────────────────────────────────────────

async function runOpenAI(
  apiKey: string,
  agent: AgentRow,
  task: TaskRow,
): Promise<{ response: string; toolResults: unknown[]; tokensUsed: number }> {
  const openai = new OpenAI({ apiKey })
  const agentTools = getToolsForAgent(agent)
  const toolResults: unknown[] = []
  let totalTokens = 0

  // Convert tool defs to OpenAI format
  const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = agentTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.input_schema as Record<string, unknown>,
    },
  }))

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: agent.system_prompt ?? 'You are a helpful AI agent.' },
    { role: 'user', content: task.input?.prompt ?? 'No prompt provided.' },
  ]

  await storeMessage(task.id, agent.id, agent.user_id, 'user', task.input?.prompt ?? '')

  const MAX_TURNS = 10
  let finalText = ''

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await openai.chat.completions.create({
      model: agent.model ?? 'gpt-4o',
      max_tokens: 4096,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      messages,
    })

    const choice = response.choices[0]
    totalTokens += (response.usage?.total_tokens ?? 0)

    const assistantMsg = choice.message

    await storeMessage(
      task.id,
      agent.id,
      agent.user_id,
      'assistant',
      assistantMsg.content ?? null,
      assistantMsg.tool_calls ?? undefined,
      undefined,
      response.usage?.total_tokens ?? undefined,
    )

    messages.push(assistantMsg)

    if (choice.finish_reason !== 'tool_calls' || !assistantMsg.tool_calls?.length) {
      finalText = assistantMsg.content ?? ''
      break
    }

    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function.name
      let input: Record<string, unknown> = {}
      try {
        input = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
      } catch {
        // malformed arguments
      }

      await emitEvent(
        agent.user_id,
        'tool_call',
        `Agent ${agent.name} calling ${toolName}`,
        {
          swarmRunId: task.swarm_run_id,
          agentId: agent.id,
          agentName: agent.name,
          data: { tool: toolName, input },
        },
      )

      let resultContent: string
      try {
        resultContent = await dispatchTool(agent.user_id, toolName, input)
      } catch (err) {
        resultContent = JSON.stringify({ error: String(err) })
      }

      toolResults.push({ tool: toolName, input, output: resultContent })

      await storeMessage(task.id, agent.id, agent.user_id, 'tool', resultContent)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: resultContent,
      })
    }
  }

  return { response: finalText, toolResults, tokensUsed: totalTokens }
}

// ── Main executor ────────────────────────────────────────────────

export async function executeTask(taskId: string, leaseToken?: string): Promise<void> {
  const supabase = getSupabase()

  // Load task — verify we still own the lease
  const query = supabase
    .from('agent_tasks')
    .select('*')
    .eq('id', taskId)

  if (leaseToken) {
    query.eq('lease_token', leaseToken)
  }

  const { data: task, error: taskError } = await query.single()

  if (taskError || !task) {
    console.error(`[executor] failed to load task ${taskId} (lease may have been reclaimed):`, taskError?.message)
    return
  }

  const typedTask = task as TaskRow

  // Load agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', typedTask.agent_id)
    .single()

  if (agentError || !agent) {
    console.error(`[executor] failed to load agent for task ${taskId}:`, agentError?.message)
    const errorUpdate = supabase
      .from('agent_tasks')
      .update({ status: 'error', last_error: 'Agent not found' })
      .eq('id', taskId)
    if (leaseToken) errorUpdate.eq('lease_token', leaseToken)
    await errorUpdate
    return
  }

  const typedAgent = agent as AgentRow

  // Task was already claimed atomically by claim_next_task RPC.
  // No need to update status/lease here — the RPC already did it.

  await emitEvent(
    typedAgent.user_id,
    'task_started',
    `Agent ${typedAgent.name} starting task`,
    {
      swarmRunId: typedTask.swarm_run_id,
      agentId: typedAgent.id,
      agentName: typedAgent.name,
      data: { taskId, phase: typedTask.phase },
    },
  )

  try {
    // Try Agentica ModelRouter first (multi-provider with fallback chains)
    const router = await getRouter()
    let result: { response: string; toolResults: unknown[]; tokensUsed: number }

    if (router) {
      result = await runViaRouter(router, typedAgent, typedTask, typedAgent.user_id)
    } else {
      // Legacy SDK path — direct Anthropic/OpenAI
      const model = typedAgent.model ?? 'claude-sonnet-4-5-20250929'
      const isOpenAI = model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')

      let apiKey: string

      if (isOpenAI) {
        const { data: cred } = await supabase
          .from('credentials')
          .select('encrypted_key')
          .eq('user_id', typedAgent.user_id)
          .eq('service', 'openai')
          .single()

        apiKey = (cred as CredentialRow | null)?.encrypted_key ?? process.env.OPENAI_API_KEY ?? ''
      } else {
        const { data: cred } = await supabase
          .from('credentials')
          .select('encrypted_key')
          .eq('user_id', typedAgent.user_id)
          .eq('service', 'anthropic')
          .single()

        apiKey = (cred as CredentialRow | null)?.encrypted_key ?? process.env.ANTHROPIC_API_KEY ?? ''
      }

      if (!apiKey) {
        throw new Error(`No API key available for ${isOpenAI ? 'OpenAI' : 'Anthropic'}`)
      }

      result = isOpenAI
        ? await runOpenAI(apiKey, typedAgent, typedTask)
        : await runAnthropic(apiKey, typedAgent, typedTask)
    }

    // Mark completed — guarded by lease_token to prevent stale writes
    const completionUpdate = supabase
      .from('agent_tasks')
      .update({
        status: 'completed',
        output: {
          response: result.response,
          toolResults: result.toolResults,
        },
        tokens_used: result.tokensUsed,
        completed_at: new Date().toISOString(),
        lease_token: null, // Release the lease
      })
      .eq('id', taskId)

    if (leaseToken) completionUpdate.eq('lease_token', leaseToken)
    await completionUpdate

    await emitEvent(
      typedAgent.user_id,
      'task_completed',
      `Agent ${typedAgent.name} completed task`,
      {
        swarmRunId: typedTask.swarm_run_id,
        agentId: typedAgent.id,
        agentName: typedAgent.name,
        data: { taskId, tokensUsed: result.tokensUsed },
      },
    )

    console.log(`[executor] task ${taskId} completed (${result.tokensUsed} tokens)`)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[executor] task ${taskId} failed:`, errorMsg)

    const attempts = typedTask.attempts ?? 0
    const maxAttempts = typedTask.max_attempts ?? 3
    const newStatus = attempts >= maxAttempts ? 'error' : 'retrying'

    const errorUpdate = supabase
      .from('agent_tasks')
      .update({
        status: newStatus,
        last_error: errorMsg,
        lease_token: null, // Release the lease
      })
      .eq('id', taskId)

    if (leaseToken) errorUpdate.eq('lease_token', leaseToken)
    await errorUpdate

    await emitEvent(
      typedAgent.user_id,
      'task_error',
      `Agent ${typedAgent.name} task failed: ${errorMsg}`,
      {
        swarmRunId: typedTask.swarm_run_id,
        agentId: typedAgent.id,
        agentName: typedAgent.name,
        data: { taskId, error: errorMsg, attempts, willRetry: newStatus === 'retrying' },
      },
    )
  }
}

// ── Lease extension ──────────────────────────────────────────────

const LEASE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const LEASE_RENEW_INTERVAL_MS = 2 * 60 * 1000 // Renew every 2 minutes

function startLeaseHeartbeat(
  taskId: string,
  leaseToken: string,
  signal: AbortSignal,
): { stop: () => void } {
  const supabase = getSupabase()
  const interval = setInterval(async () => {
    if (signal.aborted) return
    const newExpiry = new Date(Date.now() + LEASE_DURATION_MS).toISOString()
    const { count } = await supabase
      .from('agent_tasks')
      .update({ lease_expires_at: newExpiry })
      .eq('id', taskId)
      .eq('lease_token', leaseToken)
      .eq('status', 'active')

    // If no row was updated, another worker reclaimed this task
    if (count === 0) {
      console.warn(`[executor] lease lost for task ${taskId} — another worker claimed it`)
    }
  }, LEASE_RENEW_INTERVAL_MS)

  return {
    stop: () => clearInterval(interval),
  }
}

// ── Executor loop ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_000
let rpcMissingLogged = false

export async function runExecutorLoop(signal?: AbortSignal): Promise<void> {
  const supabase = getSupabase()

  console.log('[executor] starting task executor loop')

  while (!signal?.aborted) {
    try {
      // Atomic claim via RPC — the only safe path
      const { data, error } = await supabase.rpc('claim_next_task')

      if (error) {
        // RPC doesn't exist — do NOT fall back to unsafe query-based claiming.
        // Two workers doing select-then-update will grab the same task.
        if (!rpcMissingLogged) {
          console.error(
            '[executor] FATAL: claim_next_task RPC is missing. ' +
            'Run migration 0001_init.sql (or 0002) to create it. ' +
            'Worker will NOT execute tasks without atomic claiming.',
          )
          rpcMissingLogged = true
        }
        // Sleep and retry — maybe the RPC gets deployed
      } else if (data) {
        const claimed = data as { id: string; lease_token: string }
        const taskId = claimed.id
        const leaseToken = claimed.lease_token

        if (taskId && leaseToken) {
          // Start lease heartbeat with token guard
          const leaseController = new AbortController()
          if (signal) {
            signal.addEventListener('abort', () => leaseController.abort(), { once: true })
          }
          const heartbeat = startLeaseHeartbeat(taskId, leaseToken, leaseController.signal)

          try {
            await executeTask(taskId, leaseToken)
          } finally {
            heartbeat.stop()
            leaseController.abort()
          }

          continue // Check for more tasks immediately
        }
      }
      // data === null means no tasks available
    } catch (err) {
      console.error('[executor] loop error:', err)
    }

    // No tasks found — sleep before next poll
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    })
  }

  console.log('[executor] loop stopped')
}
