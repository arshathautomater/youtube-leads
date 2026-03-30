'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { QualifiedChannel } from '@/lib/types';

interface Props {
  onClose: () => void;
  onAdd: (channel: QualifiedChannel) => void;
}

export default function AddLeadModal({ onClose, onAdd }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channel_name: '',
    channel_url: '',
    channel_handle: '',
    channel_subscribers: '',
    channel_country: 'US',
    contact_email: '',
    twitter_url: '',
    instagram_url: '',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.channel_name || !form.channel_url) return;
    setSaving(true);

    // Derive a channel_id from URL or handle
    const channel_id = form.channel_url.trim().replace(/\/$/, '').split('/').pop() ?? form.channel_name;

    const res = await fetch('/api/qualified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: `manual_${channel_id}_${Date.now()}`,
        channel_name: form.channel_name.trim(),
        channel_url: form.channel_url.trim(),
        channel_handle: form.channel_handle.trim(),
        channel_thumbnail_url: '',
        channel_subscribers: parseInt(form.channel_subscribers) || 0,
        channel_country: form.channel_country,
        contact_email: form.contact_email.trim(),
        twitter_url: form.twitter_url.trim(),
        instagram_url: form.instagram_url.trim(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      onAdd(data.channel);
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Add Lead Manually</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Channel Name *</label>
            <input
              required
              value={form.channel_name}
              onChange={(e) => set('channel_name', e.target.value)}
              placeholder="e.g. Greg Isenberg"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Channel URL *</label>
            <input
              required
              value={form.channel_url}
              onChange={(e) => set('channel_url', e.target.value)}
              placeholder="https://youtube.com/@handle"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400">Handle</label>
              <input
                value={form.channel_handle}
                onChange={(e) => set('channel_handle', e.target.value)}
                placeholder="@handle"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400">Subscribers</label>
              <input
                type="number"
                min={0}
                value={form.channel_subscribers}
                onChange={(e) => set('channel_subscribers', e.target.value)}
                placeholder="e.g. 50000"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Country</label>
            <select
              value={form.channel_country}
              onChange={(e) => set('channel_country', e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            >
              <option value="US">🇺🇸 United States</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="AU">🇦🇺 Australia</option>
              <option value="">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
              placeholder="creator@example.com"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400">Twitter / X URL</label>
              <input
                value={form.twitter_url}
                onChange={(e) => set('twitter_url', e.target.value)}
                placeholder="https://x.com/handle"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400">Instagram URL</label>
              <input
                value={form.instagram_url}
                onChange={(e) => set('instagram_url', e.target.value)}
                placeholder="https://instagram.com/handle"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-700 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-yellow-600 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-50 transition-colors">
              {saving ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
