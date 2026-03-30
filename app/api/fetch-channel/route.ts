import { NextResponse } from 'next/server';

function parseYouTubeUrl(url: string): { type: 'handle' | 'channelId' | 'videoId' | 'unknown'; value: string } {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = u.pathname;

    const handleMatch = path.match(/^\/@([^/?]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };

    const channelMatch = path.match(/^\/channel\/([^/?]+)/);
    if (channelMatch) return { type: 'channelId', value: channelMatch[1] };

    const userMatch = path.match(/^\/user\/([^/?]+)/);
    if (userMatch) return { type: 'handle', value: userMatch[1] };

    const cMatch = path.match(/^\/c\/([^/?]+)/);
    if (cMatch) return { type: 'handle', value: cMatch[1] };

    const videoId = u.searchParams.get('v');
    if (videoId) return { type: 'videoId', value: videoId };

    if (u.hostname === 'youtu.be') return { type: 'videoId', value: path.slice(1).split('?')[0] };

    // bare path like /somehandle
    if (path.length > 1) return { type: 'handle', value: path.slice(1).split('/')[0] };

    return { type: 'unknown', value: '' };
  } catch {
    return { type: 'unknown', value: '' };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const KEY = process.env.YOUTUBE_API_KEY;
  const parsed = parseYouTubeUrl(url);
  let channelId = '';

  if (parsed.type === 'videoId') {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${parsed.value}&key=${KEY}`);
    const d = await r.json();
    channelId = d.items?.[0]?.snippet?.channelId ?? '';
  } else if (parsed.type === 'channelId') {
    channelId = parsed.value;
  }

  let channelRes: Response;
  if (parsed.type === 'handle') {
    channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${parsed.value}&key=${KEY}`);
  } else if (channelId) {
    channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${KEY}`);
  } else {
    return NextResponse.json({ error: 'Could not parse YouTube URL' }, { status: 400 });
  }

  const data = await channelRes.json();
  const ch = data.items?.[0];
  if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const handle = ch.snippet.customUrl ? `@${ch.snippet.customUrl.replace(/^@/, '')}` : '';

  return NextResponse.json({
    channel_id: ch.id,
    channel_name: ch.snippet.title ?? '',
    channel_handle: handle,
    channel_url: handle ? `https://youtube.com/${handle}` : `https://youtube.com/channel/${ch.id}`,
    channel_thumbnail_url: ch.snippet.thumbnails?.default?.url ?? '',
    channel_subscribers: parseInt(ch.statistics?.subscriberCount ?? '0'),
    channel_country: ch.snippet.country ?? '',
  });
}
