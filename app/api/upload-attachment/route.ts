import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import { extname } from 'path'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/tiff',
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const pregnancyId = formData.get('pregnancyId') as string | null

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

    const ext = extname(file.name) || '.' + file.type.split('/')[1]
    const safeId = pregnancyId?.replace(/[^a-z0-9-]/gi, '') || 'general'
    const filename = `lab-uploads/${safeId}/${randomUUID()}${ext}`

    // Upload to Vercel Blob with private access. The store is configured
    // as private — using 'public' here would fail with "Cannot use public
    // access on a private store". Private blobs use token-authenticated URLs.
    const blob = await put(filename, file, {
      access: 'private',
      contentType: file.type,
    })

    return NextResponse.json({
      url: blob.url,
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
