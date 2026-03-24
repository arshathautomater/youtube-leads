import { NextRequest, NextResponse } from 'next/server';
import { updateVideo } from '@/lib/db';
import type { PitchStatus } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { pitch_status?: PitchStatus; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updated = await updateVideo(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Video not found or nothing to update' }, { status: 404 });
  }
  return NextResponse.json({ video: updated });
}
