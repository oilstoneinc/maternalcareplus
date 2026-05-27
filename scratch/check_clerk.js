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
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const secretKey = env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is not set in environment");
  process.exit(1);
}

// We can make an HTTP request to Clerk API using fetch (Node 18+ has global fetch)
async function run() {
  const email = 'melodiacarellc@gmail.com';
  console.log(`Checking Clerk for email: ${email}`);

  // Fetch Clerk users
  try {
    const usersRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    const usersData = await usersRes.json();
    console.log("Clerk User search result:", usersData);
  } catch (err) {
    console.error("Clerk user fetch failed:", err);
  }

  // Fetch Clerk invitations
  try {
    const invitesRes = await fetch(`https://api.clerk.com/v1/invitations`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    const invitesData = await invitesRes.json();
    const matchInvites = invitesData.filter(inv => inv.email_address === email);
    console.log("Clerk Invitations search result (filtered for user):", matchInvites);
  } catch (err) {
    console.error("Clerk invitations fetch failed:", err);
  }
}

run();
