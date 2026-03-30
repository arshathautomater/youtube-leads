'use client';

import { useState } from 'react';
import { X, Loader2, Search, Star, CheckCircle } from 'lucide-react';
import type { QualifiedChannel } from '@/lib/types';

interface ChannelResult {
  channel_id: string;
  channel_name: string;
  channel_handle: string;
  channel_url: string;
  channel_thumbnail_url: string;
  channel_subscribers: number;
  channel_country: string;
}

interface Props {
  onClose: () => void;
  existingIds: Set<string>;
  onAdd: (channel: QualifiedChannel) => void;
}

const COUNTRY_FLAG: Record<string, string> = { US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺' };

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function FindSimilarModal({ onClose, existingIds, onAdd }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ChannelResult[]>([]);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function handleSearch() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    const res = await fetch(`/api/find-similar?url=${encodeURIComponent(url.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to find similar channels');
    } else {
      setResults(data.channels ?? []);
      setQuery(data.query ?? '');
    }
    setLoading(false);
  }

  async function handleQualify(ch: ChannelResult) {
    setAdding(ch.channel_id);
    const res = await fetch('/api/qualified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ch, contact_email: '', twitter_url: '', instagram_url: '' }),
    });
    if (res.ok) {
      const data = await res.json();
      onAdd(data.channel);
      setAdded((prev) => new Set([...prev, ch.channel_id]));
    }
    setAdding(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Find Similar Channels</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Paste a YouTube channel or video URL to discover similar creators</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 transition-colors ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="https://youtube.com/@channelname"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
            />
            <button
              onClick={handleSearch}
              disabled={!url.trim() || loading}
              className="flex items-center gap-1.5 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          {query && !loading && (
            <p className="text-xs text-neutral-500 mt-2">
              Found using keywords: <span className="text-neutral-400 font-mono">{query}</span>
            </p>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16 text-neutral-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analyzing channel content and finding similar creators…</span>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="py-12 text-center text-neutral-500 text-sm">No similar channels found. Try a different URL.</div>
          )}

          {results.length > 0 && (
            <div className="divide-y divide-neutral-800/60">
              {results.map((ch) => {
                const isExisting = existingIds.has(ch.channel_id) || added.has(ch.channel_id);
                const isAdding = adding === ch.channel_id;
                return (
                  <div key={ch.channel_id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-900/50 transition-colors">
                    {ch.channel_thumbnail_url ? (
                      <img src={ch.channel_thumbnail_url} alt={ch.channel_name}
                        className="h-10 w-10 rounded-full shrink-0 bg-neutral-800" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-neutral-800 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <a href={ch.channel_url} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-neutral-100 hover:text-red-400 transition-colors truncate block text-sm">
                        {ch.channel_name}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                        {ch.channel_handle && <span>{ch.channel_handle}</span>}
                        {ch.channel_subscribers > 0 && <span>{formatNum(ch.channel_subscribers)} subs</span>}
                        {ch.channel_country && <span>{COUNTRY_FLAG[ch.channel_country] ?? ch.channel_country}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => !isExisting && handleQualify(ch)}
                      disabled={isExisting || isAdding}
                      className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isExisting
                          ? 'bg-green-900/40 text-green-400 cursor-default'
                          : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40'
                      }`}
                    >
                      {isAdding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isExisting ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Added</>
                      ) : (
                        <><Star className="h-3.5 w-3.5" /> Qualify</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 px-5 py-3 shrink-0">
          <button onClick={onClose}
            className="w-full rounded-lg border border-neutral-700 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
