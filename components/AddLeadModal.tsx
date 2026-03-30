'use client';

import { useState } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import type { QualifiedChannel } from '@/lib/types';

interface Props {
  onClose: () => void;
  onAdd: (channel: QualifiedChannel) => void;
}

interface FetchedChannel {
  channel_id: string;
  channel_name: string;
  channel_handle: string;
  channel_url: string;
  channel_thumbnail_url: string;
  channel_subscribers: number;
  channel_country: string;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AddLeadModal({ onClose, onAdd }: Props) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetched, setFetched] = useState<FetchedChannel | null>(null);
  const [saving, setSaving] = useState(false);

  // Optional override fields
  const [email, setEmail] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');

  async function handleFetch() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError('');
    setFetched(null);
    const res = await fetch(`/api/fetch-channel?url=${encodeURIComponent(url.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      setFetchError(data.error ?? 'Failed to fetch channel');
    } else {
      setFetched(data);
    }
    setFetching(false);
  }

  async function handleAdd() {
    if (!fetched) return;
    setSaving(true);
    const res = await fetch('/api/qualified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fetched,
        contact_email: email.trim(),
        twitter_url: twitter.trim(),
        instagram_url: instagram.trim(),
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
          <h2 className="text-base font-semibold text-white">Add Lead from YouTube</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* URL input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">YouTube Channel or Video URL</label>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setFetched(null); setFetchError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                placeholder="https://youtube.com/@channelname"
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
              <button
                onClick={handleFetch}
                disabled={!url.trim() || fetching}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 transition-colors"
              >
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {fetching ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            {fetchError && <p className="text-xs text-red-400">{fetchError}</p>}
          </div>

          {/* Fetched channel preview */}
          {fetched && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex items-center gap-3">
              {fetched.channel_thumbnail_url && (
                <img src={fetched.channel_thumbnail_url} alt={fetched.channel_name}
                  className="h-12 w-12 rounded-full shrink-0 bg-neutral-800" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-neutral-100 truncate">{fetched.channel_name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                  {fetched.channel_handle && <span>{fetched.channel_handle}</span>}
                  {fetched.channel_subscribers > 0 && <span>{formatNum(fetched.channel_subscribers)} subs</span>}
                  {fetched.channel_country && <span>{fetched.channel_country}</span>}
                </div>
                <a href={fetched.channel_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 truncate block mt-0.5">
                  {fetched.channel_url}
                </a>
              </div>
            </div>
          )}

          {/* Optional contact fields */}
          {fetched && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-500 -mb-1">Optional: add contact info</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="Twitter/X URL"
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
                />
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram URL"
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-700 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={!fetched || saving}
              className="flex-1 rounded-lg bg-yellow-600 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-40 transition-colors">
              {saving ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
