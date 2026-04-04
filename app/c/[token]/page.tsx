import { notFound } from 'next/navigation';
import { getClientByToken, getProjectsByClientId } from '@/lib/db';
import ClientPortalView from '@/components/ClientPortalView';

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();
  const projects = await getProjectsByClientId(client.id);
  return <ClientPortalView clientName={client.name} projects={projects} />;
}
