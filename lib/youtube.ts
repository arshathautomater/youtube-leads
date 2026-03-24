import type { Video } from './types';

const BASE = 'https://www.googleapis.com/youtube/v3';
const TARGET_COUNTRIES = ['US', 'GB', 'AU'];

interface YTSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
}

interface YTVideoItem {
  id: string;
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YTChannelItem {
  id: string;
  snippet: {
    customUrl?: string;
    country?: string;
    description?: string;
    thumbnails?: { default?: { url: string }; medium?: { url: string }; };
  };
  statistics: {
    subscriberCount?: string;
  };
}

function extractEmail(text: string): string {
  // Exclude common false positives (image extensions, YouTube domains, etc.)
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  return matches.find((m) =>
    !m.endsWith('.png') && !m.endsWith('.jpg') &&
    !m.includes('youtube') && !m.includes('example') &&
    !m.includes('sentry') && m.length < 80
  ) ?? '';
}

// Scrape a YouTube channel's About page to extract social links and email.
// YouTube encodes external links as /redirect?q=<encoded-url> in the page HTML.
async function scrapeChannelAbout(channelId: string, handle: string): Promise<{
  contact_email: string;
  twitter_url: string;
  instagram_url: string;
}> {
  const empty = { contact_email: '', twitter_url: '', instagram_url: '' };
  try {
    // Try handle URL first (more reliable), fall back to channel ID URL
    const urls = handle
      ? [`https://www.youtube.com/${handle}/about`, `https://www.youtube.com/channel/${channelId}/about`]
      : [`https://www.youtube.com/channel/${channelId}/about`];

    let html = '';
    for (const url of urls) {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html',
        },
      });
      if (res.ok) { html = await res.text(); break; }
    }
    if (!html) return empty;

    // Extract all outbound links from YouTube's redirect wrapper
    const redirects = [...html.matchAll(/\/redirect\?[^"']*?q=([^"'&\s]+)/g)];
    const outboundUrls = redirects.map((m) => {
      try { return decodeURIComponent(m[1]); } catch { return ''; }
    }).filter(Boolean);

    let twitter_url = '';
    let instagram_url = '';

    for (const url of outboundUrls) {
      const lower = url.toLowerCase();
      if (!twitter_url && (lower.includes('twitter.com/') || lower.includes('x.com/'))) {
        // Skip x.com/i/ or twitter.com/intent/ links
        if (!lower.includes('/intent/') && !lower.includes('x.com/i/')) twitter_url = url;
      }
      if (!instagram_url && lower.includes('instagram.com/')) {
        instagram_url = url;
      }
    }

    // Extract email from the whole page
    const contact_email = extractEmail(html);

    return { contact_email, twitter_url, instagram_url };
  } catch {
    return empty;
  }
}

function extractSocialFromText(text: string): { twitter_url: string; instagram_url: string; contact_email: string } {
  const twitterMatch = text.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?!intent|i\/)[A-Za-z0-9_]+/);
  const igMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/);
  return {
    twitter_url: twitterMatch?.[0] ?? '',
    instagram_url: igMatch?.[0] ?? '',
    contact_email: extractEmail(text),
  };
}

export async function searchYouTubeVideos(keywords: string[]): Promise<Video[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not configured');

  // Step 1: Search videos per keyword × per region
  const videoMap = new Map<string, Partial<Video>>();

  for (const keyword of keywords) {
    for (const regionCode of TARGET_COUNTRIES) {
      const url =
        `${BASE}/search?part=snippet&type=video&q=${encodeURIComponent(keyword)}` +
        `&maxResults=50&regionCode=${regionCode}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`YouTube API error ${res.status}: ${JSON.stringify(err)}`);
      }
      const data = await res.json() as { items: YTSearchItem[] };
      for (const item of data.items ?? []) {
        const id = item.id.videoId;
        if (id && !videoMap.has(id)) {
          videoMap.set(id, {
            id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail_url:
              item.snippet.thumbnails.medium?.url ??
              item.snippet.thumbnails.default?.url ?? '',
            video_url: `https://www.youtube.com/watch?v=${id}`,
            published_at: item.snippet.publishedAt,
            channel_id: item.snippet.channelId,
            channel_name: item.snippet.channelTitle,
            channel_url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
          });
        }
      }
    }
  }

  if (videoMap.size === 0) return [];

  // Step 2: Fetch video statistics in batches of 50
  const videoIds = Array.from(videoMap.keys());
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const statsUrl = `${BASE}/videos?part=statistics&id=${batch.join(',')}&key=${apiKey}`;
    const res = await fetch(statsUrl);
    if (!res.ok) continue;
    const data = await res.json() as { items: YTVideoItem[] };
    for (const item of data.items ?? []) {
      const existing = videoMap.get(item.id) ?? {};
      videoMap.set(item.id, {
        ...existing,
        view_count: Number(item.statistics.viewCount ?? 0),
        like_count: Number(item.statistics.likeCount ?? 0),
        comment_count: Number(item.statistics.commentCount ?? 0),
      });
    }
  }

  // Step 3: Fetch channel details (country, subscribers, handle)
  const channelIds = [
    ...new Set(Array.from(videoMap.values()).map((v) => v.channel_id ?? '').filter(Boolean)),
  ];
  const channelData = new Map<string, {
    country: string; subscribers: number; handle: string; thumbnail_url: string;
    contact_email: string; twitter_url: string; instagram_url: string;
  }>();

  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const chUrl = `${BASE}/channels?part=snippet,statistics&id=${batch.join(',')}&key=${apiKey}`;
    const res = await fetch(chUrl);
    if (!res.ok) continue;
    const data = await res.json() as { items: YTChannelItem[] };
    for (const item of data.items ?? []) {
      const handle = item.snippet.customUrl ?? '';
      channelData.set(item.id, {
        country: item.snippet.country ?? '',
        subscribers: Number(item.statistics.subscriberCount ?? 0),
        handle: handle.startsWith('@') ? handle : handle ? `@${handle}` : '',
        thumbnail_url: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
        contact_email: '',
        twitter_url: '',
        instagram_url: '',
      });
    }
  }

  // Step 4: Filter to target countries first, then scrape About pages in parallel
  const targetChannelIds = [...channelData.entries()]
    .filter(([, ch]) => TARGET_COUNTRIES.includes(ch.country))
    .map(([id]) => id);

  // Scrape about pages in parallel (max 10 at a time to avoid rate limiting)
  const CONCURRENCY = 10;
  for (let i = 0; i < targetChannelIds.length; i += CONCURRENCY) {
    const batch = targetChannelIds.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (channelId) => {
      const ch = channelData.get(channelId)!;
      const contacts = await scrapeChannelAbout(channelId, ch.handle);
      channelData.set(channelId, { ...ch, ...contacts });
    }));
  }

  // Step 5: Merge and return — also try extracting contacts from video description as fallback
  return Array.from(videoMap.values())
    .map((v): Video & { _country: string } => {
      const ch = channelData.get(v.channel_id ?? '') ?? {
        country: '', subscribers: 0, handle: '', thumbnail_url: '',
        contact_email: '', twitter_url: '', instagram_url: '',
      };
      // Fill any still-missing contact fields from the video's own description
      const descContacts = extractSocialFromText(v.description ?? '');
      const contact_email = ch.contact_email || descContacts.contact_email;
      const twitter_url   = ch.twitter_url   || descContacts.twitter_url;
      const instagram_url = ch.instagram_url || descContacts.instagram_url;
      return {
        id: v.id ?? '',
        title: v.title ?? '',
        thumbnail_url: v.thumbnail_url ?? '',
        video_url: v.video_url ?? '',
        published_at: v.published_at ?? '',
        view_count: v.view_count ?? 0,
        like_count: v.like_count ?? 0,
        comment_count: v.comment_count ?? 0,
        description: v.description ?? '',
        channel_id: v.channel_id ?? '',
        channel_name: v.channel_name ?? '',
        channel_handle: ch.handle,
        channel_url: v.channel_url ?? '',
        channel_thumbnail_url: ch.thumbnail_url,
        channel_subscribers: ch.subscribers,
        channel_country: ch.country,
        contact_email,
        twitter_url,
        instagram_url,
        pitch_status: 'not_pitched',
        notes: '',
        found_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _country: ch.country,
      };
    })
    .filter((v) => TARGET_COUNTRIES.includes(v._country))
    .map(({ _country, ...v }) => v);
}
