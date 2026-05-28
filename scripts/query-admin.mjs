import { neon } from '@neondatabase/serverless'

const sql = neon('postgresql://neondb_owner:npg_2Pr4tmKaGELo@ep-bold-waterfall-anami8y7-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

const rows = await sql`SELECT id, email, "firstName", "lastName", role, "createdAt" FROM users WHERE role = 'admin' ORDER BY "createdAt" ASC LIMIT 10`

if (rows.length === 0) {
  console.log('No admin users found in the database.')
} else {
  console.log('Admin users found:')
  for (const row of rows) {
    console.log(`- Name: ${row.firstName} ${row.lastName}`)
    console.log(`  Email: ${row.email}`)
    console.log(`  ID: ${row.id}`)
    console.log(`  Created: ${row.createdAt}`)
    console.log('')
  }
}
