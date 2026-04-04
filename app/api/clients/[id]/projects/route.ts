import { NextResponse } from 'next/server';
import { getProjectsByClientId, createProject } from '@/lib/db';
import type { ProductionStage } from '@/lib/types';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projects = await getProjectsByClientId(id);
  return NextResponse.json({ projects });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const project = await createProject({
    client_id: id,
    title: body.title.trim(),
    thumbnail_url: body.thumbnail_url?.trim() ?? '',
    stage: (body.stage ?? 'cutting') as ProductionStage,
    delivery_date: body.delivery_date ?? '',
    notes: body.notes ?? '',
    sort_order: body.sort_order ?? 0,
  });
  return NextResponse.json({ project }, { status: 201 });
}
