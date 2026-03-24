import { NextResponse } from 'next/server';
import { getQualifiedChannels, qualifyChannel } from '@/lib/db';

export async function GET() {
  const channels = await getQualifiedChannels();
  return NextResponse.json({ channels });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { channel_id, channel_name, channel_handle, channel_url, channel_thumbnail_url, channel_subscribers, channel_country, contact_email, twitter_url, instagram_url } = body;
  if (!channel_id) return NextResponse.json({ error: 'channel_id required' }, { status: 400 });

  const channel = await qualifyChannel({
    channel_id,
    channel_name: channel_name ?? '',
    channel_handle: channel_handle ?? '',
    channel_url: channel_url ?? '',
    channel_thumbnail_url: channel_thumbnail_url ?? '',
    channel_subscribers: channel_subscribers ?? 0,
    channel_country: channel_country ?? '',
    contact_email: contact_email ?? '',
    twitter_url: twitter_url ?? '',
    instagram_url: instagram_url ?? '',
  });
  return NextResponse.json({ channel });
}
