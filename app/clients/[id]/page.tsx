'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Check, ExternalLink, Link2 } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import StageProgressBar from '@/components/StageProgressBar';
import CreateProjectModal from '@/components/CreateProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import type { Client, ClientProject, ProductionStage } from '@/lib/types';

const STAGE_OPTIONS: { value: ProductionStage; label: string }[] = [
  { value: 'cutting',        label: 'Cutting' },
  { value: 'editing',        label: 'Editing' },
  { value: 'intro_editing',  label: 'Intro Editing' },
  { value: 'sfx',            label: 'SFX' },
  { value: 'final_checking', label: 'Final Checking' },
  { value: 'completed',      label: 'Completed' },
];

function formatDeadline(d: string) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  if (isNaN(ms)) return null;
  if (ms <= 0) return 'Due now';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  return `${hours}h ${mins}m remaining`;
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

  async function handleStageChange(projectId: string, stage: ProductionStage) {
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, stage } : p));
    await fetch(`/api/clients/${id}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
  }

  function getProjectUrl(p: ClientProject) {
    if (!p.token) return '';
    return `${window.location.origin}/v/${p.token}`;
  }

  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  function handleCopyProject(p: ClientProject) {
    navigator.clipboard.writeText(getProjectUrl(p));
    setCopiedProjectId(p.id);
    setTimeout(() => setCopiedProjectId(null), 2000);
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
              {/* Thumbnail */}
              {p.thumbnail_url && (
                <div className="w-full aspect-video bg-neutral-800 overflow-hidden">
                  <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-3">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-white text-sm leading-snug">{p.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.token && (
                      <button onClick={() => handleCopyProject(p)} title="Copy project link"
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-white hover:bg-neutral-800 transition-colors">
                        {copiedProjectId === p.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Link2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
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
                {/* Inline stage dropdown */}
                <select
                  value={p.stage}
                  onChange={(e) => handleStageChange(p.id, e.target.value as ProductionStage)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-neutral-500 cursor-pointer"
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {/* Progress bar */}
                <StageProgressBar stage={p.stage} />
                {p.delivery_date && (
                  <p className="text-xs text-neutral-500">Est. time: <span className="text-neutral-300">{formatDeadline(p.delivery_date)}</span></p>
                )}
                {p.notes && (
                  <p className="text-xs text-neutral-600 border-t border-neutral-800 pt-2">{p.notes}</p>
                )}
              </div>
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
