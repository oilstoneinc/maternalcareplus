import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const getDb = () => {
  if (!process.env.NEON_DATABASE_URL) {
    console.warn('⚠️ NEON_DATABASE_URL is not set. Database queries will fail.')
    // Pass a dummy URL to prevent the neon client from crashing during module initialization.
    // The actual queries will fail, but they will be caught by our try/catch blocks.
    const sql = neon('postgresql://dummy:dummy@dummy.neon.tech/dummy')
    return drizzle(sql, { schema })
  }
  const sql = neon(process.env.NEON_DATABASE_URL)
  return drizzle(sql, { schema })
}

export const db = getDb()

export * from './schema'
