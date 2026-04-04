'use client';

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { Client } from '@/lib/types';

interface Props {
  onClose: () => void;
  onCreate: (client: Client) => void;
}

export default function CreateClientModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Client | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create client'); setLoading(false); return; }
    setCreated(data.client);
    onCreate(data.client);
    setLoading(false);
  }

  function getPortalUrl(slug: string) {
    if (typeof window === 'undefined') return '';
    const host = window.location.host;
    if (host.includes('editorkyro.com')) return `https://clientportal.editorkyro.com/${slug}`;
    return `${window.location.origin}/portal/${slug}`;
  }

  function handleCopy() {
    if (!created) return;
    navigator.clipboard.writeText(getPortalUrl(created.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="font-semibold text-white">{created ? 'Client Created!' : 'New Client'}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {created ? (
          <div className="p-5 flex flex-col gap-4">
            <p className="text-sm text-neutral-400">Share this private link with <span className="text-white font-medium">{created.name}</span>:</p>
            <div className="flex items-center gap-2 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2">
              <span className="flex-1 text-xs text-neutral-300 truncate font-mono">{getPortalUrl(created.slug)}</span>
              <button onClick={handleCopy} className="shrink-0 text-neutral-400 hover:text-white transition-colors">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-neutral-600">This is the only time the link is shown here. You can always find it on the clients page.</p>
            <button onClick={onClose} className="rounded-xl bg-neutral-700 hover:bg-neutral-600 px-4 py-2 text-sm font-medium text-white transition-colors">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400">Client name <span className="text-red-400">*</span></label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400">Email <span className="text-neutral-600">(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors">
                {loading ? 'Creating…' : 'Create Client'}
              </button>
              <button type="button" onClick={onClose} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
