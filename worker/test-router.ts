import * as dotenv from 'dotenv'
dotenv.config()

import { getRouter } from './src/model-router.ts'

async function test() {
  const router = await getRouter()
  if (router) {
    console.log('Router initialized successfully.')
    process.exit(0)
  } else {
    console.log('Router failed to initialize.')
    process.exit(1)
  }
}

test()
