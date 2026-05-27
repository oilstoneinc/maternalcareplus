import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

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
    const filename = `${randomUUID()}${ext}`

    // Save to public/uploads/<pregnancyId>/
    const uploadDir = join(process.cwd(), 'public', 'uploads', safeId)
    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(uploadDir, filename), buffer)

    const publicUrl = `/uploads/${safeId}/${filename}`

    return NextResponse.json({
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    })
  } catch (err) {
    console.error('[upload-attachment]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
