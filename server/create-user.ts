import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  const email = 'patrick@agentforge.dev'
  const password = 'forge2026!'

  // Check if user already exists
  const { data: existing } = await sb.auth.admin.listUsers()
  const found = existing?.users?.find((u) => u.email === email)

  if (found) {
    console.log(`User already exists: ${found.id}`)
    console.log(`  Email:    ${email}`)
    console.log(`  Password: ${password}`)
    return
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  }

  console.log('\n=== Account Created ===\n')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  User ID:  ${data.user.id}`)
  console.log()
}

main()
