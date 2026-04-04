'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Briefcase, Plus, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import CreateClientModal from '@/components/CreateClientModal';
import type { Client } from '@/lib/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((d) => {
      setClients(d.clients ?? []);
      setLoading(false);
    });
  }, []);

  function getPortalUrl(client: Client) {
    const host = window.location.host;
    if (host.includes('editorkyro.com')) return `https://clientportal.editorkyro.com/${client.slug}`;
    return `${window.location.origin}/portal/${client.slug}`;
  }

  function handleCopy(client: Client) {
    navigator.clipboard.writeText(getPortalUrl(client));
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this client and all their projects?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-xl bg-indigo-600 p-2.5">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Clients</h1>
            <p className="text-sm text-neutral-400">Manage client portals and production status</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors">
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-700 p-12 text-center flex flex-col items-center gap-3">
          <Briefcase className="h-10 w-10 text-neutral-700" />
          <p className="text-neutral-400 text-sm">No clients yet.</p>
          <button onClick={() => setShowCreate(true)} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
            Add your first client →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((c) => (
            <div key={c.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-xl bg-indigo-900/50 flex items-center justify-center shrink-0">
                <span className="text-indigo-300 font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{c.name}</p>
                {c.email && <p className="text-xs text-neutral-500">{c.email}</p>}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-neutral-600 font-mono truncate">clientportal.editorkyro.com/{c.slug}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleCopy(c)} title="Copy portal link"
                  className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors">
                  {copiedId === c.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <Link href={`/portal/${c.slug}`} target="_blank" title="Preview portal"
                  className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <Link href={`/clients/${c.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 transition-colors">
                  Manage →
                </Link>
                <button onClick={() => handleDelete(c.id)} title="Delete client"
                  className="p-2 rounded-lg text-neutral-700 hover:text-red-400 hover:bg-neutral-800 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreate={(client) => setClients((prev) => [client, ...prev])}
        />
      )}
    </main>
  );
}
