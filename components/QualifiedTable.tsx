'use client';

import { useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import type { QualifiedChannel, OutreachStatus } from '@/lib/types';

const COUNTRY_FLAG: Record<string, string> = { US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺' };

const OUTREACH_STATUSES: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-neutral-700 text-neutral-200' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-900/60 text-blue-300' },
  { value: 'replied', label: 'Replied', color: 'bg-yellow-900/60 text-yellow-300' },
  { value: 'deal', label: 'Deal', color: 'bg-green-900/60 text-green-300' },
  { value: 'pass', label: 'Pass', color: 'bg-neutral-800 text-neutral-500' },
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface Props {
  channels: QualifiedChannel[];
  onStatusChange: (channelId: string, status: OutreachStatus) => void;
  onRemove: (channelId: string) => void;
}

export default function QualifiedTable({ channels, onStatusChange, onRemove }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleStatusChange(channelId: string, status: OutreachStatus) {
    setSavingId(channelId);
    await onStatusChange(channelId, status);
    setSavingId(null);
  }

  function cycleStatus(current: OutreachStatus): OutreachStatus {
    const idx = OUTREACH_STATUSES.findIndex((s) => s.value === current);
    return OUTREACH_STATUSES[(idx + 1) % OUTREACH_STATUSES.length].value;
  }

  if (channels.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No qualified channels yet. Go to Search and click Qualify on channels you want to pitch.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500 uppercase tracking-wide">
            <th className="px-3 py-3">Channel</th>
            <th className="px-3 py-3">Subs</th>
            <th className="px-3 py-3">Contact</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {channels.map((ch) => {
            const statusDef = OUTREACH_STATUSES.find((s) => s.value === ch.outreach_status) ?? OUTREACH_STATUSES[0];
            return (
              <tr key={ch.channel_id} className="hover:bg-neutral-900/50 transition-colors">
                {/* Channel */}
                <td className="px-3 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    {ch.channel_thumbnail_url && (
                      <img src={ch.channel_thumbnail_url} alt={ch.channel_name} className="h-7 w-7 rounded-full shrink-0 bg-neutral-800" />
                    )}
                    <div>
                      <a href={ch.channel_url} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-neutral-100 hover:text-red-400 transition-colors">
                        {ch.channel_name}
                      </a>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ch.channel_handle && (
                          <span className="text-xs text-neutral-500">{ch.channel_handle}</span>
                        )}
                        {ch.channel_country && (
                          <span className="text-xs">{COUNTRY_FLAG[ch.channel_country] ?? ch.channel_country}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Subs */}
                <td className="px-3 py-3 text-neutral-200 font-mono text-sm">
                  {ch.channel_subscribers > 0 ? formatNum(ch.channel_subscribers) : '—'}
                </td>

                {/* Contact */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1 text-xs">
                    {ch.contact_email ? (
                      <a href={`mailto:${ch.contact_email}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 truncate max-w-[160px]"
                        title={ch.contact_email}>
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ch.contact_email}</span>
                      </a>
                    ) : null}
                    {ch.twitter_url ? (
                      <a href={ch.twitter_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300 truncate max-w-[160px]"
                        title={ch.twitter_url}>
                        <span className="font-bold text-[11px] shrink-0">𝕏</span>
                        <span className="truncate">{ch.twitter_url.replace(/https?:\/\/(www\.)?(twitter|x)\.com\//, '@')}</span>
                      </a>
                    ) : null}
                    {ch.instagram_url ? (
                      <a href={ch.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-pink-400 hover:text-pink-300 truncate max-w-[160px]"
                        title={ch.instagram_url}>
                        <span className="shrink-0">📷</span>
                        <span className="truncate">{ch.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, '@')}</span>
                      </a>
                    ) : null}
                    {!ch.contact_email && !ch.twitter_url && !ch.instagram_url && (
                      <span className="text-neutral-700">—</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <button
                    onClick={() => handleStatusChange(ch.channel_id, cycleStatus(ch.outreach_status))}
                    disabled={savingId === ch.channel_id}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-opacity ${statusDef.color} ${savingId === ch.channel_id ? 'opacity-50' : 'hover:opacity-80'}`}
                  >
                    {statusDef.label}
                  </button>
                </td>

                {/* Remove */}
                <td className="px-3 py-3">
                  <button
                    onClick={() => onRemove(ch.channel_id)}
                    className="text-neutral-700 hover:text-red-400 transition-colors"
                    title="Remove from qualified"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
