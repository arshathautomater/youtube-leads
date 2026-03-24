import { NextResponse } from 'next/server';
import { initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();
  return NextResponse.json({ ok: true, message: 'Schema initialized' });
}
