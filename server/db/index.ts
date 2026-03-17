import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Disable prefetch — required for Supabase transaction pooler (port 6543)
const queryClient = postgres(connectionString, { prepare: false })

// Drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Re-export schema for convenience
export { schema }
