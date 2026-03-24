import type { Channel } from './types';

const ACTOR_ID = 'scraper-engine/youtube-channel-finder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeChannel(item: Record<string, any>): Channel | null {
  const id =
    item.channelId ?? item.id ?? item.youtubeChannelId ?? item.channel_id ?? '';
  const channel_name =
    item.channelName ?? item.name ?? item.title ?? item.channel_name ?? '';
  const handle =
    item.channelHandle ?? item.handle ?? item.customUrl ?? item.username ?? '';
  const channel_url =
    item.channelUrl ?? item.url ?? item.link ?? item.channel_url ?? '';
  const thumbnail_url =
    item.thumbnailUrl ?? item.avatar ?? item.profileImage ??
    item.thumbnail ?? item.channelThumbnail ?? '';
  const subscribers = Number(
    item.subscriberCount ?? item.subscribers ?? item.numberOfSubscribers ??
    item.followerCount ?? 0
  );
  const total_views = Number(
    item.viewCount ?? item.totalViews ?? item.views ?? item.total_views ?? 0
  );
  const video_count = Number(
    item.videoCount ?? item.numberOfVideos ?? item.videosCount ??
    item.video_count ?? 0
  );
  const description =
    item.description ?? item.about ?? item.bio ?? '';

  if (!id || !channel_name) return null;

  const view_sub_ratio = subscribers > 0
    ? Math.round((total_views / subscribers) * 10) / 10
    : 0;

  return {
    id,
    channel_name,
    handle: handle.startsWith('@') ? handle : handle ? `@${handle}` : '',
    thumbnail_url,
    subscribers,
    total_views,
    video_count,
    description,
    channel_url: channel_url || `https://www.youtube.com/channel/${id}`,
    view_sub_ratio,
    pitch_status: 'not_pitched',
    notes: '',
    found_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function findYouTubeChannels(keywords: string[]): Promise<Channel[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not configured');

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}&format=json&timeout=120`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchQueries: keywords,
        maxResultsPerQuery: 20,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Apify API error ${res.status}: ${text}`);
  }

  const items = await res.json() as Record<string, unknown>[];
  return items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item) => normalizeChannel(item as Record<string, any>))
    .filter((ch): ch is Channel => ch !== null);
}
