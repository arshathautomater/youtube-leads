import { NextResponse } from 'next/server';
import { getClientByToken, getProjectsByClientId } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const projects = await getProjectsByClientId(client.id);
  // Omit token and email from public response
  return NextResponse.json({ client: { id: client.id, name: client.name }, projects });
}
