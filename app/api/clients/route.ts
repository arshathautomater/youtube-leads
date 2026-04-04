import { NextResponse } from 'next/server';
import { getClients, addClient } from '@/lib/db';

export async function GET() {
  const clients = await getClients();
  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const client = await addClient(name.trim(), email?.trim() ?? '');
  return NextResponse.json({ client }, { status: 201 });
}
