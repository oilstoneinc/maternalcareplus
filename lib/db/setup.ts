import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'

// Read .env file manually to load connection string without dependencies
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*NEON_DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/)
    if (match) {
      process.env.NEON_DATABASE_URL = match[1].trim()
    }
  })
}

if (!process.env.NEON_DATABASE_URL) {
  console.error('NEON_DATABASE_URL is not set in your .env file')
  process.exit(1)
}

const sql = neon(process.env.NEON_DATABASE_URL)

async function setup() {
  console.log('Connecting to Neon database and setting up tables/views...')
  try {
    // 1. Create hospital_invites table
    await sql(`
      CREATE TABLE IF NOT EXISTS hospital_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        hospital_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP DEFAULT NOW(),
        accepted_at TIMESTAMP
      )
    `)
    console.log('✓ hospital_invites table setup successful')

    // 1.5. Add is_verified to hospitals table if not exists
    await sql(`
      ALTER TABLE hospitals 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
    `)
    console.log('✓ hospitals table altered to include is_verified column')

    // 2. Create pregnant_women view
    await sql(`
      CREATE OR REPLACE VIEW pregnant_women AS 
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        address, 
        region, 
        city, 
        emergency_contact, 
        emergency_phone, 
        is_verified, 
        is_active, 
        hospital_id, 
        created_at 
      FROM users 
      WHERE role = 'pregnant_woman'
    `)
    console.log('✓ pregnant_women view setup successful')

    console.log('Setup successfully completed!')
  } catch (error) {
    console.error('Error executing setup DDL:', error)
    process.exit(1)
  }
}

setup()
