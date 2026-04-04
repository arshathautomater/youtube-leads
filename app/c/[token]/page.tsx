import { notFound } from 'next/navigation';
import { getClientByToken, getProjectsByClientId } from '@/lib/db';
import ClientPortalView from '@/components/ClientPortalView';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const client = await getClientByToken(token);
  return { title: client ? `${client.name} | Production Portal` : 'Client Portal' };
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();
  const projects = await getProjectsByClientId(client.id);
  return <ClientPortalView clientName={client.name} projects={projects} />;
}
