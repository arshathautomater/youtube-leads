'use client';

import { useState } from 'react';
import { ExternalLink, ChevronUp, ChevronDown, Youtube, Mail, Star } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Video, PitchStatus } from '@/lib/types';

type SortKey = 'view_count' | 'like_count' | 'channel_subscribers' | 'published_at';

const COUNTRY_FLAG: Record<string, string> = { US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺' };

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  videos: Video[];
  onStatusChange: (id: string, status: PitchStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  qualifiedIds: Set<string>;
  onQualify: (v: Video) => void;
}

export default function VideoTable({ videos, onStatusChange, onNotesChange, qualifiedIds, onQualify }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('view_count');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...videos].sort((a, b) => {
    const av = sortKey === 'published_at' ? new Date(a.published_at).getTime() : (a[sortKey] as number);
    const bv = sortKey === 'published_at' ? new Date(b.published_at).getTime() : (b[sortKey] as number);
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-red-400" /> : <ChevronUp className="h-3 w-3 text-red-400" />;
  }

  async function handleStatusChange(id: string, status: PitchStatus) {
    setSavingId(id);
    await onStatusChange(id, status);
    setSavingId(null);
  }

  async function handleNoteBlur(v: Video) {
    const notes = localNotes[v.id] ?? v.notes;
    if (notes !== v.notes) {
      setSavingId(v.id);
      await onNotesChange(v.id, notes);
      setSavingId(null);
    }
  }

  if (videos.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No videos found. Run a search to discover leads.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500 uppercase tracking-wide">
            <th className="px-3 py-3 w-20">Thumb</th>
            <th className="px-3 py-3">Video / Channel</th>
            <th className="px-3 py-3 cursor-pointer hover:text-neutral-300 select-none" onClick={() => toggleSort('view_count')}>
              <span className="flex items-center gap-1">Views <SortIcon col="view_count" /></span>
            </th>
            <th className="px-3 py-3 cursor-pointer hover:text-neutral-300 select-none" onClick={() => toggleSort('channel_subscribers')}>
              <span className="flex items-center gap-1">Ch. Subs <SortIcon col="channel_subscribers" /></span>
            </th>
            <th className="px-3 py-3 cursor-pointer hover:text-neutral-300 select-none" onClick={() => toggleSort('published_at')}>
              <span className="flex items-center gap-1">Date <SortIcon col="published_at" /></span>
            </th>
            <th className="px-3 py-3 min-w-36">Contact</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3 min-w-36">Notes</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {sorted.map((v) => (
            <tr key={v.id} className="hover:bg-neutral-900/50 transition-colors group">
              {/* Thumbnail */}
              <td className="px-3 py-3">
                <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="block relative">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="w-16 rounded-md object-cover bg-neutral-800 aspect-video" />
                  ) : (
                    <div className="w-20 aspect-video rounded-md bg-neutral-800 flex items-center justify-center">
                      <Youtube className="h-4 w-4 text-neutral-600" />
                    </div>
                  )}
                </a>
              </td>

              {/* Video + channel */}
              <td className="px-4 py-3 max-w-xs">
                <div className="flex items-start gap-1">
                  <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-neutral-100 leading-snug line-clamp-2 hover:text-red-400 transition-colors">
                    {v.title}
                  </a>
                  <ExternalLink className="h-3 w-3 text-neutral-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {v.channel_thumbnail_url && (
                    <img src={v.channel_thumbnail_url} alt={v.channel_name} className="h-4 w-4 rounded-full shrink-0 bg-neutral-800" />
                  )}
                  <a href={v.channel_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                    {v.channel_name}
                  </a>
                  {v.channel_handle && (
                    <span className="text-xs text-neutral-600">{v.channel_handle}</span>
                  )}
                  {v.channel_country && (
                    <span className="text-xs">{COUNTRY_FLAG[v.channel_country] ?? v.channel_country}</span>
                  )}
                </div>
              </td>

              {/* Views */}
              <td className="px-4 py-3 text-neutral-200 font-mono text-sm">
                {v.view_count > 0 ? formatNum(v.view_count) : '—'}
              </td>

              {/* Channel subscribers */}
              <td className="px-3 py-3 text-neutral-200 font-mono text-sm">
                {v.channel_subscribers > 0 ? formatNum(v.channel_subscribers) : '—'}
              </td>

              {/* Published */}
              <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">
                {formatDate(v.published_at)}
              </td>

              {/* Contact */}
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1 text-xs">
                  {v.contact_email ? (
                    <a href={`mailto:${v.contact_email}`}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 truncate max-w-[140px]"
                      title={v.contact_email}>
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{v.contact_email}</span>
                    </a>
                  ) : null}
                  {v.twitter_url ? (
                    <a href={v.twitter_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sky-400 hover:text-sky-300 truncate max-w-[140px]"
                      title={v.twitter_url}>
                      <span className="font-bold text-[11px] shrink-0">𝕏</span>
                      <span className="truncate">{v.twitter_url.replace(/https?:\/\/(www\.)?(twitter|x)\.com\//, '@')}</span>
                    </a>
                  ) : null}
                  {v.instagram_url ? (
                    <a href={v.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-pink-400 hover:text-pink-300 truncate max-w-[140px]"
                      title={v.instagram_url}>
                      <span className="shrink-0">📷</span>
                      <span className="truncate">{v.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, '@')}</span>
                    </a>
                  ) : null}
                  {!v.contact_email && !v.twitter_url && !v.instagram_url && (
                    <span className="text-neutral-700">—</span>
                  )}
                </div>
              </td>

              {/* Status */}
              <td className="px-3 py-3">
                <StatusBadge
                  status={v.pitch_status}
                  onChange={(next) => handleStatusChange(v.id, next)}
                  disabled={savingId === v.id}
                />
              </td>

              {/* Notes */}
              <td className="px-3 py-3">
                <input
                  type="text"
                  value={localNotes[v.id] ?? v.notes}
                  onChange={(e) => setLocalNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                  onBlur={() => handleNoteBlur(v)}
                  placeholder="Add notes…"
                  className="w-full bg-transparent text-xs text-neutral-400 placeholder-neutral-700 outline-none border-b border-transparent focus:border-neutral-600 transition-colors py-0.5"
                />
              </td>

              {/* Qualify */}
              <td className="px-3 py-3">
                {qualifiedIds.has(v.channel_id) ? (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    Qualified
                  </span>
                ) : (
                  <button
                    onClick={() => onQualify(v)}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-yellow-400 transition-colors whitespace-nowrap"
                  >
                    <Star className="h-3 w-3" />
                    Qualify
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
