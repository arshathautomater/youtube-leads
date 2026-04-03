import { NextResponse } from 'next/server';
import { getDisqualifiedChannelIds, disqualifyChannel, undisqualifyChannel } from '@/lib/db';

export async function GET() {
  const ids = await getDisqualifiedChannelIds();
  return NextResponse.json({ ids });
}

export async function POST(req: Request) {
  const { channel_id } = await req.json();
  if (!channel_id) return NextResponse.json({ error: 'channel_id required' }, { status: 400 });
  await disqualifyChannel(channel_id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { channel_id } = await req.json();
  if (!channel_id) return NextResponse.json({ error: 'channel_id required' }, { status: 400 });
  await undisqualifyChannel(channel_id);
  return NextResponse.json({ ok: true });
}
