const { put } = require('@vercel/blob')
const fs = require('fs')
const path = require('path')

// Parse .env manually
const envPath = path.join(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/)
  if (match) {
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    env[match[1]] = value
  }
})

process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN

async function testBlob() {
  console.log('Testing Vercel Blob upload...')
  console.log('Token starts with:', process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 30) + '...')
  
  try {
    // Upload a tiny test text file
    const testContent = new Blob(['MaternalCare Plus blob test - ' + new Date().toISOString()], { type: 'text/plain' })
    const blob = await put('lab-uploads/test/blob-connectivity-test.txt', testContent, {
      access: 'public',
      contentType: 'text/plain',
    })
    console.log('✅ Blob upload SUCCESS!')
    console.log('   Public URL:', blob.url)
    console.log('   Size:', blob.size, 'bytes')
  } catch (err) {
    console.error('❌ Blob upload FAILED:', err.message || err)
  }
}

testBlob()
