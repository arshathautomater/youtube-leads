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
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  return matches.find((m) =>
    !m.endsWith('.png') && !m.endsWith('.jpg') &&
    !m.includes('youtube') && !m.includes('example') &&
    !m.includes('sentry') && m.length < 80
  ) ?? '';
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

const LINK_IN_BIO_DOMAINS = [
  'linktr.ee', 'beacons.ai', 'bio.link', 'allmylinks.com',
  'linkpop.com', 'stan.store', 'carrd.co', 'koji.to',
];

async function scrapeLinkInBio(url: string): Promise<{ contact_email: string; twitter_url: string; instagram_url: string }> {
  const empty = { contact_email: '', twitter_url: '', instagram_url: '' };
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    });
    if (!res.ok) return empty;
    const html = await res.text();
    const twitterMatch = html.match(/href="(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?!intent|i\/)[A-Za-z0-9_][^"]*?)"/i);
    const igMatch = html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.][^"]*?)"/i);
    return {
      contact_email: extractEmail(html),
      twitter_url: twitterMatch?.[1]?.split('?')[0] ?? '',
      instagram_url: igMatch?.[1]?.split('?')[0] ?? '',
    };
  } catch {
    return empty;
  }
}

export async function scrapeChannelContacts(channelId: string, handle: string): Promise<{
  contact_email: string;
  twitter_url: string;
  instagram_url: string;
}> {
  const empty = { contact_email: '', twitter_url: '', instagram_url: '' };
  try {
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

    // Extract all outbound redirect links from YouTube's redirect wrapper
    const redirects = [...html.matchAll(/\/redirect\?[^"']*?q=([^"'&\s]+)/g)];
    const outboundUrls = redirects.map((m) => {
      try { return decodeURIComponent(m[1]); } catch { return ''; }
    }).filter(Boolean);

    let twitter_url = '';
    let instagram_url = '';
    let contact_email = extractEmail(html);
    let linkInBioUrl = '';

    for (const url of outboundUrls) {
      const lower = url.toLowerCase();
      if (!twitter_url && (lower.includes('twitter.com/') || lower.includes('x.com/'))) {
        if (!lower.includes('/intent/') && !lower.includes('x.com/i/')) twitter_url = url;
      }
      if (!instagram_url && lower.includes('instagram.com/')) instagram_url = url;
      if (!linkInBioUrl && LINK_IN_BIO_DOMAINS.some((d) => lower.includes(d))) linkInBioUrl = url;
    }

    // Follow link-in-bio page to find any missing contacts
    if (linkInBioUrl && (!twitter_url || !instagram_url || !contact_email)) {
      const bio = await scrapeLinkInBio(linkInBioUrl);
      if (!twitter_url && bio.twitter_url) twitter_url = bio.twitter_url;
      if (!instagram_url && bio.instagram_url) instagram_url = bio.instagram_url;
      if (!contact_email && bio.contact_email) contact_email = bio.contact_email;
    }

    return { contact_email, twitter_url, instagram_url };
  } catch {
    return empty;
  }
}

export async function searchYouTubeVideos(keywords: string[]): Promise<Video[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not configured');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // Deduplicate by channelId — one video (most recent) per channel, up to 100
  const channelBestVideo = new Map<string, { videoId: string } & YTSearchItem['snippet']>();

  outer: for (const keyword of keywords) {
    for (const regionCode of TARGET_COUNTRIES) {
      let pageToken = '';
      for (let page = 0; page < 2; page++) {
        const params = new URLSearchParams({
          part: 'snippet',
          type: 'video',
          q: keyword,
          maxResults: '50',
          regionCode,
          publishedAfter: thirtyDaysAgo,
          order: 'date',
          key: apiKey,
        });
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`${BASE}/search?${params}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`YouTube API error ${res.status}: ${JSON.stringify(err)}`);
        }
        const data = await res.json() as { items: YTSearchItem[]; nextPageToken?: string };
        pageToken = data.nextPageToken ?? '';

        for (const item of data.items ?? []) {
          const channelId = item.snippet.channelId;
          if (!channelBestVideo.has(channelId)) {
            channelBestVideo.set(channelId, { videoId: item.id.videoId, ...item.snippet });
          }
        }

        if (channelBestVideo.size >= 100 || !pageToken) break;
      }
      if (channelBestVideo.size >= 100) break outer;
    }
  }

  if (channelBestVideo.size === 0) return [];

  // Step 2: Fetch video stats
  const videoIds = [...channelBestVideo.values()].map((v) => v.videoId);
  const videoStats = new Map<string, { view_count: number; like_count: number; comment_count: number }>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const res = await fetch(`${BASE}/videos?part=statistics&id=${batch.join(',')}&key=${apiKey}`);
    if (!res.ok) continue;
    const data = await res.json() as { items: YTVideoItem[] };
    for (const item of data.items ?? []) {
      videoStats.set(item.id, {
        view_count: Number(item.statistics.viewCount ?? 0),
        like_count: Number(item.statistics.likeCount ?? 0),
        comment_count: Number(item.statistics.commentCount ?? 0),
      });
    }
  }

  // Step 3: Fetch channel details (no About page scraping — deferred to qualify time)
  const channelIds = [...channelBestVideo.keys()];
  const channelData = new Map<string, {
    country: string; subscribers: number; handle: string; thumbnail_url: string;
    contact_email: string; twitter_url: string; instagram_url: string;
  }>();

  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const res = await fetch(`${BASE}/channels?part=snippet,statistics&id=${batch.join(',')}&key=${apiKey}`);
    if (!res.ok) continue;
    const data = await res.json() as { items: YTChannelItem[] };
    for (const item of data.items ?? []) {
      const handle = item.snippet.customUrl ?? '';
      const descContacts = extractSocialFromText(item.snippet.description ?? '');
      channelData.set(item.id, {
        country: item.snippet.country ?? '',
        subscribers: Number(item.statistics.subscriberCount ?? 0),
        handle: handle.startsWith('@') ? handle : handle ? `@${handle}` : '',
        thumbnail_url: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
        ...descContacts,
      });
    }
  }

  // Step 4: Build results filtered to target countries
  return [...channelBestVideo.entries()]
    .map(([channelId, snippet]): (Video & { _country: string }) | null => {
      const ch = channelData.get(channelId);
      if (!ch || !TARGET_COUNTRIES.includes(ch.country)) return null;
      const stats = videoStats.get(snippet.videoId) ?? { view_count: 0, like_count: 0, comment_count: 0 };
      return {
        id: snippet.videoId,
        title: snippet.title,
        thumbnail_url: snippet.thumbnails.medium?.url ?? snippet.thumbnails.default?.url ?? '',
        video_url: `https://www.youtube.com/watch?v=${snippet.videoId}`,
        published_at: snippet.publishedAt,
        view_count: stats.view_count,
        like_count: stats.like_count,
        comment_count: stats.comment_count,
        description: snippet.description,
        channel_id: channelId,
        channel_name: snippet.channelTitle,
        channel_handle: ch.handle,
        channel_url: ch.handle ? `https://www.youtube.com/${ch.handle}` : `https://www.youtube.com/channel/${channelId}`,
        channel_thumbnail_url: ch.thumbnail_url,
        channel_subscribers: ch.subscribers,
        channel_country: ch.country,
        contact_email: ch.contact_email,
        twitter_url: ch.twitter_url,
        instagram_url: ch.instagram_url,
        pitch_status: 'not_pitched',
        notes: '',
        found_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _country: ch.country,
      };
    })
    .filter((v): v is Video & { _country: string } => v !== null)
    .map(({ _country, ...v }) => v);
}
