import { NextResponse } from 'next/server';
import { updateClient, deleteClient } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: { name?: string; email?: string; payment_amount?: number; payment_notes?: string } = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.email !== undefined) patch.email = body.email;
  if (body.payment_amount !== undefined) patch.payment_amount = Number(body.payment_amount);
  if (body.payment_notes !== undefined) patch.payment_notes = body.payment_notes;
  const client = await updateClient(id, patch);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ client });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteClient(id);
  return NextResponse.json({ ok: true });
}
