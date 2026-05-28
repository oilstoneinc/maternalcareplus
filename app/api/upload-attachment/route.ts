import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

// Dynamically construct UPLOADTHING_TOKEN for UploadThing v7+ compatibility if not present
if (process.env.UPLOADTHING_SECRET && process.env.UPLOADTHING_APP_ID && !process.env.UPLOADTHING_TOKEN) {
  const tokenObj = {
    apiKey: process.env.UPLOADTHING_SECRET,
    appId: process.env.UPLOADTHING_APP_ID,
    regions: ["sea1"]
  }
  process.env.UPLOADTHING_TOKEN = Buffer.from(JSON.stringify(tokenObj)).toString('base64')
}

import { UTApi } from 'uploadthing/server'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/tiff',
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const utapi = new UTApi()

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Upload JPEG, PNG, WEBP, PDF or TIFF.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 10 MB.' },
        { status: 400 }
      )
    }

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles(file)

    if (uploadResult.error) {
      console.error('[upload-attachment] UploadThing error:', uploadResult.error)
      return NextResponse.json(
        { error: uploadResult.error.message || 'Upload failed via UploadThing' },
        { status: 400 }
      )
    }

    if (!uploadResult.data) {
      return NextResponse.json(
        { error: 'No data returned from UploadThing' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: uploadResult.data.url,
      name: file.name,
      type: file.type,
      size: file.size,
    })
  } catch (err: any) {
    console.error('[upload-attachment] error:', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

