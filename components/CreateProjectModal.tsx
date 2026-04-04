'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { ClientProject, ProductionStage } from '@/lib/types';

const STAGES: { value: ProductionStage; label: string }[] = [
  { value: 'cutting',        label: 'Cutting' },
  { value: 'editing',        label: 'Editing' },
  { value: 'intro_editing',  label: 'Intro Editing' },
  { value: 'sfx',            label: 'SFX' },
  { value: 'final_checking', label: 'Final Checking' },
  { value: 'completed',      label: 'Completed' },
];

interface Props {
  clientId: string;
  sortOrder: number;
  onClose: () => void;
  onCreate: (p: ClientProject) => void;
}

export default function CreateProjectModal({ clientId, sortOrder, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [stage, setStage] = useState<ProductionStage>('cutting');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    const res = await fetch(`/api/clients/${clientId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), thumbnail_url: thumbnailUrl.trim(), stage, delivery_date: deliveryDate, notes: notes.trim(), sort_order: sortOrder }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create project'); setLoading(false); return; }
    onCreate(data.project);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="font-semibold text-white">Add Video Project</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Video title <span className="text-red-400">*</span></label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How I Made $10k in 30 Days"
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Thumbnail URL <span className="text-neutral-600">(optional)</span></label>
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..."
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400">Current stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value as ProductionStage)}
                className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500">
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400">Est. delivery</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Notes for client <span className="text-neutral-600">(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any details visible to the client…"
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500 resize-none" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors">
              {loading ? 'Adding…' : 'Add Project'}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
