/**
 * File Write Tool — Supabase Storage Upload
 *
 * Uploads content to the 'artifacts' bucket in Supabase Storage.
 */

import { createClient } from '@supabase/supabase-js'

export interface FileWriteResult {
  path: string
  size: number
}

export async function fileWrite(
  userId: string,
  name: string,
  content: string,
  mimeType: string = 'text/plain',
): Promise<FileWriteResult> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const path = `${userId}/${Date.now()}-${name}`
  const buffer = Buffer.from(content, 'utf-8')

  const { error } = await supabase.storage
    .from('artifacts')
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`)
  }

  return { path, size: buffer.byteLength }
}
