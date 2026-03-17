import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data, error } = await sb
    .from('memories')
    .update({ embedding_status: 'pending' })
    .eq('embedding_status', 'failed')
    .select('id')

  console.log('Reset', data?.length ?? 0, 'failed embeddings to pending')
  if (error) console.error(error.message)
}

main()
