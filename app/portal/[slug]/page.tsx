import { notFound } from 'next/navigation';
import { getClientBySlug, getProjectsByClientId } from '@/lib/db';
import ClientPortalView from '@/components/ClientPortalView';

export default async function SlugPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const projects = await getProjectsByClientId(client.id);
  return <ClientPortalView clientName={client.name} projects={projects} />;
}
