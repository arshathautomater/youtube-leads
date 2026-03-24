import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeVideos } from '@/lib/youtube';
import { upsertVideo } from '@/lib/db';

export async function POST(req: NextRequest) {
  let keywords: string[];
  try {
    const body = await req.json();
    keywords = body.keywords;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'keywords must be a non-empty array' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({
      error: 'YOUTUBE_API_KEY not configured. Get a free key at console.cloud.google.com → YouTube Data API v3'
    }, { status: 500 });
  }

  try {
    const videos = await searchYouTubeVideos(keywords);
    const saved = await Promise.all(videos.map(async (v) => await upsertVideo({
      id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      video_url: v.video_url,
      published_at: v.published_at,
      view_count: v.view_count,
      like_count: v.like_count,
      comment_count: v.comment_count,
      description: v.description,
      channel_id: v.channel_id,
      channel_name: v.channel_name,
      channel_handle: v.channel_handle,
      channel_url: v.channel_url,
      channel_thumbnail_url: v.channel_thumbnail_url,
      channel_subscribers: v.channel_subscribers,
      channel_country: v.channel_country,
      contact_email: v.contact_email,
      twitter_url: v.twitter_url,
      instagram_url: v.instagram_url,
    })));
    return NextResponse.json({ videos: saved, count: saved.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
