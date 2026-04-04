import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProjectByToken, getProjectsByClientId, getClientById } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const project = await getProjectByToken(token);
  return { title: project ? `${project.title} | Production Portal` : 'Client Portal' };
}
import { Film, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import StageBadge from '@/components/StageBadge';
import StageProgressBar from '@/components/StageProgressBar';
import CountdownTimer from '@/components/CountdownTimer';
import type { ClientProject } from '@/lib/types';

function isIso(s: string) {
  return s && !isNaN(new Date(s).getTime()) && s.includes('T');
}

function ProjectCard({ p, isMain }: { p: ClientProject; isMain: boolean }) {
  return (
    <div className={`rounded-2xl border bg-neutral-900 overflow-hidden ${isMain ? 'border-indigo-800/50' : 'border-neutral-800'}`}>
      {p.thumbnail_url && (
        <div className={`w-full bg-neutral-800 overflow-hidden ${isMain ? 'aspect-video' : 'aspect-video'}`}>
          <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className={`font-semibold text-white leading-snug ${isMain ? 'text-base' : 'text-sm'}`}>{p.title}</h2>
          <StageBadge stage={p.stage} />
        </div>
        <StageProgressBar stage={p.stage} />
        {p.delivery_date && isIso(p.delivery_date) && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="h-3 w-3 shrink-0" />
            <CountdownTimer deadline={p.delivery_date} />
          </div>
        )}
        {p.notes && (
          <p className="text-xs text-neutral-500 leading-relaxed border-t border-neutral-800 pt-3">{p.notes}</p>
        )}
      </div>
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) notFound();

  const [client, allProjects] = await Promise.all([
    getClientById(project.client_id),
    getProjectsByClientId(project.client_id),
  ]);

  const otherProjects = allProjects.filter((p) => p.id !== project.id);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800/60 bg-neutral-900/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Link href={`/c/${client?.token ?? ''}`} className="p-1.5 rounded-lg text-neutral-600 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="rounded-lg bg-indigo-600 p-2">
            <Film className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium">Production Status</p>
            <h1 className="text-base font-semibold text-white leading-tight">{client?.name ?? 'Your Project'}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
        {/* Current project */}
        <ProjectCard p={project} isMain />

        {/* Other projects */}
        {otherProjects.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-600 uppercase tracking-widest font-medium">Other videos</p>
            {otherProjects.map((p) => (
              <Link key={p.id} href={p.token ? `/v/${p.token}` : '#'} className="block hover:opacity-90 transition-opacity">
                <ProjectCard p={p} isMain={false} />
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-neutral-800">Questions? Reach out to your editor directly.</p>
      </div>
    </main>
  );
}
