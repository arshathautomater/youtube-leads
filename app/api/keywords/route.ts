import { NextRequest, NextResponse } from 'next/server';
import { getKeywords, addKeyword } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ keywords: await getKeywords() });
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 });
  const keyword = await addKeyword(text);
  return NextResponse.json({ keyword });
}
