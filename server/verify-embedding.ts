import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
)

async function main() {
  const { data } = await sb
    .from('memories')
    .select('id, namespace, embedding_status, embedding_model, content')
    .limit(5)

  console.log('\n=== Memories with Embedding Status ===\n')
  for (const m of data ?? []) {
    console.log(`  [${m.embedding_status}] model: ${m.embedding_model ?? 'none'} | ns: ${m.namespace}`)
    console.log(`    ${m.content?.slice(0, 120)}`)
  }
  console.log()
}

main()
