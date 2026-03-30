'use client';

import { useState, useCallback, useEffect } from 'react';
import { Youtube, AlertCircle, Star, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import FilterBar from '@/components/FilterBar';
import VideoTable from '@/components/VideoTable';
import type { Video, PitchStatus } from '@/lib/types';

function isWithinDate(publishedAt: string, filter: string): boolean {
  if (filter === 'any') return true;
  const pub = new Date(publishedAt).getTime();
  const now = Date.now();
  if (filter === 'today') return now - pub < 86_400_000;
  if (filter === 'week')  return now - pub < 7 * 86_400_000;
  if (filter === 'month') return now - pub < 30 * 86_400_000;
  return true;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [status, setStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('any');
  const [minSubs, setMinSubs] = useState(1000);
  const [maxSubs, setMaxSubs] = useState(2000000);
  const [hasSearched, setHasSearched] = useState(false);
  const [qualifiedIds, setQualifiedIds] = useState<Set<string>>(new Set());
  const [qualifiedCount, setQualifiedCount] = useState(0);

  useEffect(() => {
    fetch('/api/qualified')
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>((d.channels ?? []).map((c: { channel_id: string }) => c.channel_id));
        setQualifiedIds(ids);
        setQualifiedCount(ids.size);
      });
  }, []);

  async function handleSearch(keywords: string[]) {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Search failed'); return; }
      setVideos(data.videos as Video[]);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = useCallback(async (id: string, status: PitchStatus) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pitch_status: status }),
    });
    if (res.ok) {
      const data = await res.json();
      setVideos((prev) => prev.map((v) => (v.id === id ? data.video : v)));
    }
  }, []);

  const handleNotesChange = useCallback(async (id: string, notes: string) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      const data = await res.json();
      setVideos((prev) => prev.map((v) => (v.id === id ? data.video : v)));
    }
  }, []);

  const handleQualify = useCallback(async (v: Video) => {
    const res = await fetch('/api/qualified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: v.channel_id,
        channel_name: v.channel_name,
        channel_handle: v.channel_handle,
        channel_url: v.channel_url,
        channel_thumbnail_url: v.channel_thumbnail_url,
        channel_subscribers: v.channel_subscribers,
        channel_country: v.channel_country,
        contact_email: v.contact_email,
        twitter_url: v.twitter_url,
        instagram_url: v.instagram_url,
      }),
    });
    if (res.ok) {
      setQualifiedIds((prev) => new Set([...prev, v.channel_id]));
      setQualifiedCount((n) => n + 1);
    }
  }, []);

  const filtered = videos.filter((v) => {
    if (status !== 'all' && v.pitch_status !== status) return false;
    if (!isWithinDate(v.published_at, dateFilter)) return false;
    if (v.channel_subscribers > 0 && v.channel_subscribers < minSubs) return false;
    if (v.channel_subscribers > 0 && v.channel_subscribers > maxSubs) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-600 p-2.5">
              <Youtube className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">YouTube Lead Finder</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Find videos from US 🇺🇸 UK 🇬🇧 AU 🇦🇺 channels to pitch your editing service.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href="/qualified"
            className="flex items-center gap-2 rounded-xl border border-yellow-700/50 bg-yellow-950/30 px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-950/50 transition-colors">
            <Star className="h-4 w-4" />
            Qualified Leads
            {qualifiedCount > 0 && (
              <span className="ml-1 rounded-full bg-yellow-600 px-1.5 py-0.5 text-xs text-white font-medium">{qualifiedCount}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Search */}
      <SearchForm onSearch={handleSearch} loading={loading} />

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12 text-neutral-400">
          <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <p className="text-sm">Searching YouTube videos…</p>
          <p className="text-xs text-neutral-600">This usually takes a few seconds</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <>
          <FilterBar
            status={status} onStatusChange={setStatus}
            dateFilter={dateFilter} onDateFilterChange={setDateFilter}
            minSubs={minSubs} maxSubs={maxSubs}
            onMinSubsChange={setMinSubs} onMaxSubsChange={setMaxSubs}
            videos={filtered}
          />
          <p className="text-sm text-neutral-500">
            {filtered.length} video{filtered.length !== 1 ? 's' : ''} found
            {videos.length !== filtered.length && ` (${videos.length} total)`}
          </p>
          <VideoTable
            videos={filtered}
            onStatusChange={handleStatusChange}
            onNotesChange={handleNotesChange}
            qualifiedIds={qualifiedIds}
            onQualify={handleQualify}
          />
        </>
      )}

      {/* Empty state */}
      {!loading && !hasSearched && (
        <div className="py-20 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 mb-4">
            <Youtube className="h-8 w-8 text-neutral-600" />
          </div>
          <p className="text-neutral-500 text-sm">Select keywords above and hit Search to find videos.</p>
        </div>
      )}
    </main>
  );
}
