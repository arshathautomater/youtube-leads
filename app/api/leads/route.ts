import { NextRequest, NextResponse } from 'next/server';
import { getVideos } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const minSubs = searchParams.get('minSubs');
  const maxSubs = searchParams.get('maxSubs');

  const videos = await getVideos({
    status,
    minSubs: minSubs ? Number(minSubs) : undefined,
    maxSubs: maxSubs ? Number(maxSubs) : undefined,
  });

  return NextResponse.json({ videos, total: videos.length });
}
