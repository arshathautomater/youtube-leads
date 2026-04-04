import { notFound } from 'next/navigation';
import { getClientBySlug, getProjectsByClientId } from '@/lib/db';
import ClientPortalView from '@/components/ClientPortalView';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  return { title: client ? `${client.name} | Production Portal` : 'Client Portal' };
}

export default async function SlugPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const projects = await getProjectsByClientId(client.id);
  return <ClientPortalView clientName={client.name} projects={projects} />;
}
