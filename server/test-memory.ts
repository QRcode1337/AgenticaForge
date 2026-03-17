import * as dotenv from 'dotenv'
dotenv.config()
import { AgentDB } from 'agentdb'

async function test() {
  try {
    console.log('Initializing AgentDB...')
    const db = new AgentDB({ dbPath: ':memory:' })
    await db.initialize()
    console.log('Initialized.')
    
    const rb = db.getController('reasoning')
    await rb.storePattern({
      task: 'Test task',
      success: true,
      reward: 1.0,
      sessionId: 'test'
    })
    console.log('Stored pattern.')
    const results = await rb.retrievePatterns('Test task')
    console.log('Results:', results)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}
test()
