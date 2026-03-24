'use client';

import { useState } from 'react';
import { ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Channel, PitchStatus } from '@/lib/types';

type SortKey = 'subscribers' | 'view_sub_ratio' | 'video_count';

const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  AU: '🇦🇺',
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface Props {
  channels: Channel[];
  onStatusChange: (id: string, status: PitchStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}

export default function ChannelTable({ channels, onStatusChange, onNotesChange }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('subscribers');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...channels].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === 'desc' ? -diff : diff;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3 text-red-400" />
      : <ChevronUp className="h-3 w-3 text-red-400" />;
  }

  async function handleStatusChange(id: string, status: PitchStatus) {
    setSavingId(id);
    await onStatusChange(id, status);
    setSavingId(null);
  }

  async function handleNoteBlur(ch: Channel) {
    const notes = localNotes[ch.id] ?? ch.notes;
    if (notes !== ch.notes) {
      setSavingId(ch.id);
      await onNotesChange(ch.id, notes);
      setSavingId(null);
    }
  }

  if (channels.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No channels found. Run a search to discover leads.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500 uppercase tracking-wide">
            <th className="px-4 py-3 w-12"></th>
            <th className="px-4 py-3">Channel</th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-neutral-300 select-none"
              onClick={() => toggleSort('subscribers')}
            >
              <span className="flex items-center gap-1">
                Subscribers <SortIcon col="subscribers" />
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-neutral-300 select-none"
              onClick={() => toggleSort('view_sub_ratio')}
            >
              <span className="flex items-center gap-1">
                Views/Sub <SortIcon col="view_sub_ratio" />
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-neutral-300 select-none"
              onClick={() => toggleSort('video_count')}
            >
              <span className="flex items-center gap-1">
                Videos <SortIcon col="video_count" />
              </span>
            </th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 min-w-48">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {sorted.map((ch) => (
            <tr key={ch.id} className="hover:bg-neutral-900/50 transition-colors group">
              {/* Thumbnail */}
              <td className="px-4 py-3">
                {ch.thumbnail_url ? (
                  <img
                    src={ch.thumbnail_url}
                    alt={ch.channel_name}
                    className="h-8 w-8 rounded-full object-cover bg-neutral-800"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 text-xs font-bold">
                    {ch.channel_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </td>

              {/* Channel info */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-neutral-100 leading-tight">{ch.channel_name}</span>
                      {ch.country && (
                        <span title={ch.country} className="text-sm leading-none">{COUNTRY_FLAG[ch.country] ?? ch.country}</span>
                      )}
                    </div>
                    {ch.handle && (
                      <div className="text-xs text-neutral-500 mt-0.5">{ch.handle}</div>
                    )}
                  </div>
                  <a
                    href={ch.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-300" />
                  </a>
                </div>
                {ch.description && (
                  <div className="text-xs text-neutral-600 mt-1 max-w-xs truncate">
                    {ch.description}
                  </div>
                )}
              </td>

              {/* Subscribers */}
              <td className="px-4 py-3 text-neutral-200 font-mono text-sm">
                {ch.subscribers > 0 ? formatNum(ch.subscribers) : '—'}
              </td>

              {/* View/Sub ratio */}
              <td className="px-4 py-3 text-neutral-200 font-mono text-sm">
                {ch.view_sub_ratio > 0 ? `${ch.view_sub_ratio}x` : '—'}
              </td>

              {/* Video count */}
              <td className="px-4 py-3 text-neutral-200 font-mono text-sm">
                {ch.video_count > 0 ? ch.video_count.toLocaleString() : '—'}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <StatusBadge
                  status={ch.pitch_status}
                  onChange={(next) => handleStatusChange(ch.id, next)}
                  disabled={savingId === ch.id}
                />
              </td>

              {/* Notes */}
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={localNotes[ch.id] ?? ch.notes}
                  onChange={(e) => setLocalNotes((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                  onBlur={() => handleNoteBlur(ch)}
                  placeholder="Add notes…"
                  className="w-full bg-transparent text-xs text-neutral-400 placeholder-neutral-700 outline-none border-b border-transparent focus:border-neutral-600 transition-colors py-0.5"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
