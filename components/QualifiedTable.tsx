'use client';

import { useState } from 'react';
import { Mail, Trash2, Bell, X } from 'lucide-react';
import type { QualifiedChannel, OutreachStatus } from '@/lib/types';

const COUNTRY_FLAG: Record<string, string> = { US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺' };

const OUTREACH_STATUSES: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-neutral-700 text-neutral-200' },
  { value: 'contacted_x', label: 'Contacted in X', color: 'bg-sky-900/60 text-sky-300' },
  { value: 'contacted_instagram', label: 'Contacted Instagram', color: 'bg-pink-900/60 text-pink-300' },
  { value: 'contacted_skool', label: 'Contacted in Skool', color: 'bg-purple-900/60 text-purple-300' },
  { value: 'contacted_email', label: 'Contacted in Email', color: 'bg-blue-900/60 text-blue-300' },
  { value: 'follow_up_sent', label: 'Follow Up Sent', color: 'bg-orange-900/60 text-orange-300' },
  { value: 'replied', label: 'Replied', color: 'bg-yellow-900/60 text-yellow-300' },
  { value: 'deal', label: 'Deal', color: 'bg-green-900/60 text-green-300' },
  { value: 'pass', label: 'Pass', color: 'bg-neutral-800 text-neutral-500' },
];

const CONTACTED_STATUSES = new Set(['contacted_x', 'contacted_instagram', 'contacted_skool', 'contacted_email']);

const STATUS_SOCIAL_MAP: Record<string, { field: 'twitter_url' | 'instagram_url' | 'contact_email'; label: string; placeholder: string }> = {
  contacted_x:         { field: 'twitter_url',    label: 'Their X / Twitter URL',   placeholder: 'https://x.com/username' },
  contacted_instagram: { field: 'instagram_url',  label: 'Their Instagram URL',      placeholder: 'https://instagram.com/username' },
  contacted_email:     { field: 'contact_email',  label: 'Their email address',      placeholder: 'name@example.com' },
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function FollowUpBadge({ contactedAt }: { contactedAt: string }) {
  if (!contactedAt) return null;
  const daysSince = Math.floor((Date.now() - new Date(contactedAt).getTime()) / 86_400_000);
  const daysLeft = 3 - daysSince;
  if (daysLeft > 3 || daysLeft < -30) return null; // don't show if too far in future or very old
  if (daysLeft > 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-orange-400 mt-1">
        <Bell className="h-2.5 w-2.5" />
        Follow up in {daysLeft}d
      </span>
    );
  }
  if (daysLeft === 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-yellow-400 mt-1 font-medium">
        <Bell className="h-2.5 w-2.5" />
        Follow up today!
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-red-400 mt-1 font-medium">
      <Bell className="h-2.5 w-2.5" />
      Overdue by {Math.abs(daysLeft)}d
    </span>
  );
}

interface Props {
  channels: QualifiedChannel[];
  onStatusChange: (channelId: string, status: OutreachStatus) => void;
  onUpdateContact: (channelId: string, field: 'twitter_url' | 'instagram_url' | 'contact_email', value: string) => void;
  onRemove: (channelId: string) => void;
}

type Prompt = { channelId: string; status: OutreachStatus; field: 'twitter_url' | 'instagram_url' | 'contact_email'; label: string; placeholder: string };

export default function QualifiedTable({ channels, onStatusChange, onUpdateContact, onRemove }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptValue, setPromptValue] = useState('');

  async function handleStatusChange(channelId: string, status: OutreachStatus) {
    const socialMap = STATUS_SOCIAL_MAP[status];
    if (socialMap) {
      const ch = channels.find((c) => c.channel_id === channelId);
      const hasSocial = ch?.[socialMap.field];
      if (!hasSocial) {
        setPrompt({ channelId, status, ...socialMap });
        setPromptValue('');
        return;
      }
    }
    setSavingId(channelId);
    await onStatusChange(channelId, status);
    setSavingId(null);
  }

  async function handlePromptSave() {
    if (!prompt) return;
    setSavingId(prompt.channelId);
    if (promptValue.trim()) await onUpdateContact(prompt.channelId, prompt.field, promptValue.trim());
    await onStatusChange(prompt.channelId, prompt.status);
    setSavingId(null);
    setPrompt(null);
  }

  async function handlePromptSkip() {
    if (!prompt) return;
    setSavingId(prompt.channelId);
    await onStatusChange(prompt.channelId, prompt.status);
    setSavingId(null);
    setPrompt(null);
  }

  const channel = prompt ? channels.find((c) => c.channel_id === prompt.channelId) : null;

  if (channels.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No qualified channels yet. Go to Search and click Qualify on channels you want to pitch.
      </div>
    );
  }

  return (
    <>
    {prompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white text-sm">Add contact info</p>
            <button onClick={() => setPrompt(null)} className="text-neutral-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          {channel && (
            <div className="flex items-center gap-2">
              {channel.channel_thumbnail_url && <img src={channel.channel_thumbnail_url} className="h-7 w-7 rounded-full" />}
              <span className="text-sm text-neutral-300">{channel.channel_name}</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">{prompt.label}</label>
            <input
              autoFocus
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePromptSave()}
              placeholder={prompt.placeholder}
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handlePromptSave} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors">
              Save & Continue
            </button>
            <button onClick={handlePromptSkip} className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors">
              Skip
            </button>
          </div>
        </div>
      </div>
    )}
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
                  <select
                    value={ch.outreach_status}
                    onChange={(e) => handleStatusChange(ch.channel_id, e.target.value as OutreachStatus)}
                    disabled={savingId === ch.channel_id}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer appearance-none transition-opacity ${statusDef.color} ${savingId === ch.channel_id ? 'opacity-50' : ''}`}
                  >
                    {OUTREACH_STATUSES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-neutral-900 text-neutral-100">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {CONTACTED_STATUSES.has(ch.outreach_status) && (
                    <FollowUpBadge contactedAt={ch.contacted_at} />
                  )}
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
    </>
  );
}
