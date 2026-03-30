import { NextResponse } from 'next/server';
import { updateQualifiedChannel, unqualifyChannel } from '@/lib/db';
import type { OutreachStatus } from '@/lib/types';

export async function PATCH(req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const body = await req.json();
  const patch: { outreach_status?: OutreachStatus; notes?: string; contacted_at?: string } = {};
  if (body.outreach_status !== undefined) patch.outreach_status = body.outreach_status;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.contacted_at !== undefined) patch.contacted_at = body.contacted_at;

  const channel = await updateQualifiedChannel(channelId, patch);
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ channel });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  await unqualifyChannel(channelId);
  return NextResponse.json({ ok: true });
}
