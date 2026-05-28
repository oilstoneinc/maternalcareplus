const { UTApi, UTFile } = require('uploadthing/server')
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

process.env.UPLOADTHING_SECRET = env.UPLOADTHING_SECRET
process.env.UPLOADTHING_APP_ID = env.UPLOADTHING_APP_ID

// We will test several regions to see which one succeeds
const REGIONS_TO_TRY = ["fra1", "us-east-1", "sea1", "us1"];

async function testUploadThing() {
  console.log('Testing UploadThing upload with dynamic region detection...')
  console.log('Secret starts with:', process.env.UPLOADTHING_SECRET?.slice(0, 15) + '...')
  console.log('App ID:', process.env.UPLOADTHING_APP_ID)

  for (const region of REGIONS_TO_TRY) {
    console.log(`\nTrying region: "${region}"...`)
    
    // Construct UPLOADTHING_TOKEN for this region
    const tokenObj = {
      apiKey: process.env.UPLOADTHING_SECRET,
      appId: process.env.UPLOADTHING_APP_ID,
      regions: [region]
    }
    process.env.UPLOADTHING_TOKEN = Buffer.from(JSON.stringify(tokenObj)).toString('base64')

    try {
      const utapi = new UTApi()
      
      // Use UTFile with a buffer
      const buffer = Buffer.from('MaternalCare Plus UploadThing connectivity test - ' + new Date().toISOString())
      const file = new UTFile([buffer], 'uploadthing-connectivity-test.txt', { type: 'text/plain' })
      
      const result = await utapi.uploadFiles(file)
      
      if (result.error) {
        console.warn(`⚠️  Region "${region}" failed:`, result.error.message || result.error)
        continue
      }
      
      console.log(`\n✅ UploadThing SUCCESS on region "${region}"!`)
      console.log('   Public URL:', result.data.url)
      console.log('   Key:', result.data.key)
      console.log('   Size:', result.data.size, 'bytes')
      console.log('\nUse this region in your production token!')
      return region
    } catch (err) {
      console.warn(`⚠️  Region "${region}" error:`, err.message || err)
    }
  }
  
  console.error('\n❌ All regions failed to upload.')
}

testUploadThing()


