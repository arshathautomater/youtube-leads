import { NextResponse } from 'next/server';
import { getQualifiedChannels, qualifyChannel, updateQualifiedChannel } from '@/lib/db';
import { scrapeChannelContacts } from '@/lib/youtube';

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

  // Scrape About page + link-in-bio for contact info, filling any gaps
  const scraped = await scrapeChannelContacts(channel_id, channel_handle ?? '');
  const updatedContacts = {
    contact_email: contact_email || scraped.contact_email || undefined,
    twitter_url: twitter_url || scraped.twitter_url || undefined,
    instagram_url: instagram_url || scraped.instagram_url || undefined,
  };
  if (updatedContacts.contact_email || updatedContacts.twitter_url || updatedContacts.instagram_url) {
    await updateQualifiedChannel(channel_id, updatedContacts);
  }

  // Return enriched channel
  const enriched = { ...channel, ...updatedContacts };
  return NextResponse.json({ channel: enriched });
}
