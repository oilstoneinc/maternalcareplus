const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    // Remove outer quotes if present
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const dbUrl = env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error("NEON_DATABASE_URL is not set in environment");
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  const email = 'melodiacarellc@gmail.com';
  console.log(`Checking database for user email: ${email}`);
  
  try {
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    console.log("Users matches:", users);

    const invites = await sql`SELECT * FROM hospital_invites WHERE email = ${email}`;
    console.log("Hospital Invites matches:", invites);
  } catch (err) {
    console.error("Database query failed:", err);
  }
}

run();
