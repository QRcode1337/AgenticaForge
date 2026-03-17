/**
 * Agent Call — Single synchronous LLM call
 *
 * For Command Center interactive use. NOT queued — calls the LLM directly.
 * Loads agent config + user API key, dispatches to Anthropic or OpenAI.
 *
 * SECURITY: user_id derived from session JWT, never from client payload.
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getCredentialKey } from './credentials.js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── Model routing ────────────────────────────────────────────────

function getProvider(model: string): 'anthropic' | 'openai' {
  if (model.startsWith('claude') || model.startsWith('anthropic')) return 'anthropic'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
  // Default to anthropic
  return 'anthropic'
}

function getServiceName(provider: 'anthropic' | 'openai'): string {
  return provider === 'anthropic' ? 'anthropic' : 'openai'
}

// ── Anthropic call ───────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string | null,
  userPrompt: string,
): Promise<{ response: string; tokensUsed: number }> {
  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt ?? 'You are a helpful AI assistant.',
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  const response = textBlock ? textBlock.text : ''
  const tokensUsed = (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0)

  return { response, tokensUsed }
}

// ── OpenAI call ──────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string | null,
  userPrompt: string,
): Promise<{ response: string; tokensUsed: number }> {
  const client = new OpenAI({ apiKey })

  const messages: OpenAI.ChatCompletionMessageParam[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: userPrompt })

  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 4096,
  })

  const response = completion.choices[0]?.message?.content ?? ''
  const tokensUsed =
    (completion.usage?.prompt_tokens ?? 0) +
    (completion.usage?.completion_tokens ?? 0)

  return { response, tokensUsed }
}

// ── Main call function ───────────────────────────────────────────

export async function callAgent(
  userId: string,
  agentId: string,
  prompt: string,
): Promise<{ response: string; tokensUsed: number }> {
  // Load agent config
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, system_prompt, model, tools, config')
    .eq('id', agentId)
    .eq('user_id', userId)
    .single()

  if (agentError || !agent) {
    throw new Error(agentError?.message ?? 'Agent not found')
  }

  const model = (agent.model as string) ?? 'claude-sonnet-4-5-20250929'
  const systemPrompt = agent.system_prompt as string | null
  const provider = getProvider(model)
  const service = getServiceName(provider)

  // Get user's API key for this provider
  const apiKey = await getCredentialKey(userId, service)
  if (!apiKey) {
    throw new Error(
      `No ${service} API key configured. Add one in Integration Hub.`,
    )
  }

  // Dispatch to provider
  if (provider === 'anthropic') {
    return callAnthropic(apiKey, model, systemPrompt, prompt)
  }
  return callOpenAI(apiKey, model, systemPrompt, prompt)
}
