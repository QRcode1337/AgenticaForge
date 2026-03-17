/**
 * Credentials Edge Function
 *
 * Handles secure storage and retrieval of API keys per user.
 * In production, deploy as a Supabase Edge Function.
 *
 * SECURITY:
 *   - Never accept user_id from client payload. Derive from session JWT.
 *   - Never return encrypted_key to client. Return "configured: true" only.
 *   - getCredentialKey() is for worker use only (server-side).
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Encryption key derived from service role — in production use KMS / Vault
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY
  ?? supabaseServiceKey.slice(0, 32)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── Encrypt / Decrypt helpers ─────────────────────────────────────

function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'utf-8'),
    iv,
  )
  let encrypted = cipher.update(plaintext, 'utf-8', 'base64')
  encrypted += cipher.final('base64')
  return { ciphertext: encrypted, iv: iv.toString('base64') }
}

function decrypt(ciphertext: string, iv: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'utf-8'),
    Buffer.from(iv, 'base64'),
  )
  let decrypted = decipher.update(ciphertext, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

// ── Store credential ────────────────────────────────────────────

export async function storeCredential(
  userId: string,
  service: string,
  apiKey: string,
  config?: Record<string, unknown>,
) {
  const { ciphertext, iv } = encrypt(apiKey)

  // Upsert: one credential per user+service
  const { data: existing } = await supabase
    .from('credentials')
    .select('id, key_version')
    .eq('user_id', userId)
    .eq('service', service)
    .single()

  if (existing) {
    const nextVersion = (existing.key_version ?? 1) + 1
    const { error } = await supabase
      .from('credentials')
      .update({
        encrypted_key: ciphertext,
        iv,
        key_version: nextVersion,
        config,
        rotated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw error
    return { id: existing.id, updated: true, version: nextVersion }
  }

  const { data, error } = await supabase
    .from('credentials')
    .insert({
      user_id: userId,
      service,
      encrypted_key: ciphertext,
      iv,
      key_version: 1,
      config,
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id, updated: false, version: 1 }
}

// ── List credentials (masked — never exposes keys) ───────────────

export async function listCredentials(userId: string) {
  const { data, error } = await supabase
    .from('credentials')
    .select('id, service, config, key_version, created_at, rotated_at')
    .eq('user_id', userId)

  if (error) throw error

  return (data ?? []).map((cred) => ({
    id: cred.id,
    service: cred.service,
    config: cred.config,
    configured: true,
    keyVersion: cred.key_version,
    createdAt: cred.created_at,
    rotatedAt: cred.rotated_at,
  }))
}

// ── Get credential (worker-only, server-side) ────────────────────

export async function getCredentialKey(userId: string, service: string) {
  const { data, error } = await supabase
    .from('credentials')
    .select('encrypted_key, iv')
    .eq('user_id', userId)
    .eq('service', service)
    .single()

  if (error || !data?.encrypted_key || !data?.iv) return null
  return decrypt(data.encrypted_key, data.iv)
}

// ── Delete credential ────────────────────────────────────────────

export async function deleteCredential(userId: string, service: string) {
  const { error } = await supabase
    .from('credentials')
    .delete()
    .eq('user_id', userId)
    .eq('service', service)

  if (error) throw error
  return { deleted: true }
}
