import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { updateProject, deleteProject, getClientById } from '@/lib/db';
import type { ProductionStage } from '@/lib/types';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const { id, projectId } = await params;
  const body = await req.json();
  const patch: { title?: string; thumbnail_url?: string; stage?: ProductionStage; delivery_date?: string; notes?: string; sort_order?: number } = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.thumbnail_url !== undefined) patch.thumbnail_url = body.thumbnail_url;
  if (body.stage !== undefined) patch.stage = body.stage as ProductionStage;
  if (body.delivery_date !== undefined) {
    const h = body.delivery_date;
    patch.delivery_date = h && !isNaN(Number(h)) && Number(h) > 0
      ? new Date(Date.now() + Number(h) * 3600000).toISOString()
      : '';
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
  const project = await updateProject(projectId, patch);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Bust portal caches immediately
  const client = await getClientById(id);
  if (client) {
    revalidatePath(`/portal/${client.slug}`);
    revalidatePath(`/c/${client.token}`);
  }
  if (project.token) revalidatePath(`/v/${project.token}`);

  return NextResponse.json({ project });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const { id, projectId } = await params;
  const client = await getClientById(id);
  await deleteProject(projectId);
  if (client) {
    revalidatePath(`/portal/${client.slug}`);
    revalidatePath(`/c/${client.token}`);
  }
  return NextResponse.json({ ok: true });
}
