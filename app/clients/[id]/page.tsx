'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import StageBadge from '@/components/StageBadge';
import StageProgressBar from '@/components/StageProgressBar';
import CreateProjectModal from '@/components/CreateProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import type { Client, ClientProject } from '@/lib/types';

function formatHours(h: string) {
  if (!h) return null;
  return `${h} hour${h !== '1' ? 's' : ''}`;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<ClientProject | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients`).then((r) => r.json()),
      fetch(`/api/clients/${id}/projects`).then((r) => r.json()),
    ]).then(([clientsData, projectsData]) => {
      const found = (clientsData.clients ?? []).find((c: Client) => c.id === id);
      setClient(found ?? null);
      setProjects(projectsData.projects ?? []);
      setLoading(false);
    });
  }, [id]);

  function getPortalUrl() {
    if (!client) return '';
    return `${window.location.origin}/c/${client.token}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(getPortalUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDeleteProject(projectId: string) {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/clients/${id}/projects/${projectId}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }

  if (loading) return (
    <div className="flex justify-center py-40">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{client?.name ?? 'Client'}</h1>
            {client?.email && <p className="text-sm text-neutral-400">{client.email}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Portal link */}
          {client && (
            <div className="flex items-center gap-1">
              <button onClick={handleCopy} title="Copy portal link"
                className="flex items-center gap-1.5 rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copy link
              </button>
              <Link href={`/c/${client.token}`} target="_blank"
                className="p-2 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors">
            <Plus className="h-4 w-4" />
            Add Project
          </button>
        </div>
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-700 p-12 text-center flex flex-col items-center gap-3">
          <p className="text-neutral-400 text-sm">No projects yet.</p>
          <button onClick={() => setShowCreate(true)} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
            Add first project →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt={p.title} className="h-20 w-36 rounded-xl object-cover bg-neutral-800 shrink-0" />
                ) : (
                  <div className="h-20 w-36 rounded-xl bg-neutral-800 shrink-0 flex items-center justify-center">
                    <span className="text-neutral-600 text-xs">No thumb</span>
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white leading-snug">{p.title}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditProject(p)}
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-white hover:bg-neutral-800 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteProject(p.id)}
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-neutral-800 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <StageBadge stage={p.stage} />
                  {p.delivery_date && (
                    <p className="text-xs text-neutral-500">Est. time: <span className="text-neutral-300">{formatHours(p.delivery_date)}</span></p>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="px-4 pb-4">
                <StageProgressBar stage={p.stage} />
              </div>
              {p.notes && (
                <div className="px-4 pb-4 border-t border-neutral-800 pt-3">
                  <p className="text-xs text-neutral-500">{p.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          clientId={id}
          sortOrder={projects.length}
          onClose={() => setShowCreate(false)}
          onCreate={(p) => setProjects((prev) => [...prev, p])}
        />
      )}
      {editProject && (
        <EditProjectModal
          project={editProject}
          clientId={id}
          onClose={() => setEditProject(null)}
          onUpdate={(p) => setProjects((prev) => prev.map((x) => x.id === p.id ? p : x))}
        />
      )}
    </main>
  );
}
