import { NextResponse } from 'next/server'
import { ensureMCHSchema } from '@/lib/db/ensure-mch-schema'

export async function GET() {
  try {
    await ensureMCHSchema()
    return NextResponse.json({ success: true, message: 'MCH schema ensured successfully' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Migration failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
