import { NextRequest, NextResponse } from 'next/server';
import { deleteKeyword } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteKeyword(id);
  return NextResponse.json({ ok: true });
}
