import { db } from './db/index.js'

async function testConnection() {
  try {
    console.log('Testing database connection...')
    const result = await db.execute('SELECT NOW()')
    console.log('✅ Database connected successfully!')
    console.log('Server time:', result)
    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()
