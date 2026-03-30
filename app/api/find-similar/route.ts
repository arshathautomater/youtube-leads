import { NextResponse } from 'next/server';

function parseHandle(url: string): { type: 'handle' | 'channelId' | 'videoId'; value: string } | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = u.pathname;
    const handleMatch = path.match(/^\/@([^/?]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };
    const channelMatch = path.match(/^\/channel\/([^/?]+)/);
    if (channelMatch) return { type: 'channelId', value: channelMatch[1] };
    const userMatch = path.match(/^\/user\/([^/?]+)/);
    if (userMatch) return { type: 'handle', value: userMatch[1] };
    const videoId = u.searchParams.get('v');
    if (videoId) return { type: 'videoId', value: videoId };
    if (u.hostname === 'youtu.be') return { type: 'videoId', value: path.slice(1) };
    const bare = path.slice(1).split('/')[0];
    if (bare) return { type: 'handle', value: bare };
    return null;
  } catch { return null; }
}

const STOPWORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','how','what','why','when','where','who','which','that','this','these','those','it','its','my','your','our','their','i','you','we','they','he','she','not','no','so','as','if','from','by','about','into','through','up','out','vs','part','more','new','best','top','using','use','get','can','make','just','like','your','my','all']);

function extractKeywords(titles: string[]): string {
  const freq: Record<string, number> = {};
  for (const t of titles) {
    for (const w of t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) {
      if (w.length > 3 && !STOPWORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w).join(' ');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const KEY = process.env.YOUTUBE_API_KEY;
  const parsed = parseHandle(url);
  if (!parsed) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });

  // Resolve channelId
  let channelId = '';
  if (parsed.type === 'channelId') {
    channelId = parsed.value;
  } else if (parsed.type === 'videoId') {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${parsed.value}&key=${KEY}`);
    const d = await r.json();
    channelId = d.items?.[0]?.snippet?.channelId ?? '';
  } else {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${parsed.value}&key=${KEY}`);
    const d = await r.json();
    channelId = d.items?.[0]?.id ?? '';
  }
  if (!channelId) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  // Get channel info + top videos
  const [chRes, vidRes] = await Promise.all([
    fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,topicDetails&id=${channelId}&key=${KEY}`),
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=10&key=${KEY}`),
  ]);
  const [chData, vidData] = await Promise.all([chRes.json(), vidRes.json()]);

  const ch = chData.items?.[0];
  if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  // Build search query from video titles + channel topic
  const titles: string[] = (vidData.items ?? []).map((v: { snippet: { title: string } }) => v.snippet.title as string);
  const keywords = extractKeywords(titles) || ch.snippet.title;

  // Search for similar channels (3 regions)
  const regions = ['US', 'GB', 'AU'];
  const seen = new Set<string>([channelId]);
  const results: unknown[] = [];

  await Promise.all(regions.map(async (region) => {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keywords)}&type=channel&regionCode=${region}&maxResults=10&key=${KEY}`
    );
    const d = await r.json();
    for (const item of (d.items ?? [])) {
      const cid = item.snippet?.channelId;
      if (!cid || seen.has(cid)) continue;
      seen.add(cid);
      results.push({ channelId: cid, snippet: item.snippet });
    }
  }));

  // Fetch full channel stats for results
  if (results.length === 0) return NextResponse.json({ channels: [] });

  const ids = (results as Array<{ channelId: string; snippet: unknown }>).map(r => r.channelId).join(',');
  const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids}&key=${KEY}`);
  const statsData = await statsRes.json();

  const channels = (statsData.items ?? []).map((c: {
    id: string;
    snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } }; country?: string };
    statistics?: { subscriberCount?: string };
  }) => {
    const handle = c.snippet.customUrl ? `@${c.snippet.customUrl.replace(/^@/, '')}` : '';
    return {
      channel_id: c.id,
      channel_name: c.snippet.title,
      channel_handle: handle,
      channel_url: handle ? `https://youtube.com/${handle}` : `https://youtube.com/channel/${c.id}`,
      channel_thumbnail_url: c.snippet.thumbnails?.default?.url ?? '',
      channel_subscribers: parseInt(c.statistics?.subscriberCount ?? '0'),
      channel_country: c.snippet.country ?? '',
    };
  }).filter((c: { channel_subscribers: number }) => c.channel_subscribers > 1000);

  return NextResponse.json({ channels, query: keywords });
}
