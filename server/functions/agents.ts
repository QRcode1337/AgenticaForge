/**
 * Agent Definition CRUD
 *
 * Manages agent configurations — name, role, system prompt, model, tools.
 *
 * SECURITY: user_id derived from session JWT, never from client payload.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── Types ────────────────────────────────────────────────────────

type AgentRole = 'scout' | 'worker' | 'coordinator' | 'specialist' | 'guardian'

interface CreateAgentData {
  name: string
  role: AgentRole
  systemPrompt?: string
  model?: string
  tools?: string[]
  config?: Record<string, unknown>
}

type UpdateAgentData = Partial<CreateAgentData>

// ── List agents ──────────────────────────────────────────────────

export async function listAgents(userId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('id, user_id, name, role, system_prompt, model, tools, config, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ── Get single agent ─────────────────────────────────────────────

export async function getAgent(userId: string, agentId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('id, user_id, name, role, system_prompt, model, tools, config, created_at')
    .eq('id', agentId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

// ── Create agent ─────────────────────────────────────────────────

export async function createAgent(userId: string, input: CreateAgentData) {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      user_id: userId,
      name: input.name,
      role: input.role,
      system_prompt: input.systemPrompt ?? null,
      model: input.model ?? 'claude-sonnet-4-5-20250929',
      tools: input.tools ?? [],
      config: input.config ?? {},
    })
    .select('id, user_id, name, role, system_prompt, model, tools, config, created_at')
    .single()

  if (error) throw error
  return data
}

// ── Update agent ─────────────────────────────────────────────────

export async function updateAgent(
  userId: string,
  agentId: string,
  input: UpdateAgentData,
) {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.role !== undefined) updates.role = input.role
  if (input.systemPrompt !== undefined) updates.system_prompt = input.systemPrompt
  if (input.model !== undefined) updates.model = input.model
  if (input.tools !== undefined) updates.tools = input.tools
  if (input.config !== undefined) updates.config = input.config

  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .eq('user_id', userId)
    .select('id, user_id, name, role, system_prompt, model, tools, config, created_at')
    .single()

  if (error) throw error
  return data
}

// ── Delete agent ─────────────────────────────────────────────────

export async function deleteAgent(userId: string, agentId: string) {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('user_id', userId)

  if (error) throw error
  return { deleted: true }
}
