'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Send, MessageCircle, Handshake, Users, XCircle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { QualifiedChannel } from '@/lib/types';

const STATUSES = [
  { value: 'new',                  label: 'New',                  color: 'bg-neutral-700',    text: 'text-neutral-200' },
  { value: 'contacted_x',          label: 'Contacted in X',       color: 'bg-sky-900/80',     text: 'text-sky-300' },
  { value: 'contacted_instagram',  label: 'Contacted Instagram',  color: 'bg-pink-900/80',    text: 'text-pink-300' },
  { value: 'contacted_skool',      label: 'Contacted in Skool',   color: 'bg-purple-900/80',  text: 'text-purple-300' },
  { value: 'contacted_email',      label: 'Contacted in Email',   color: 'bg-blue-900/80',    text: 'text-blue-300' },
  { value: 'follow_up_sent',       label: 'Follow Up Sent',       color: 'bg-orange-900/80',  text: 'text-orange-300' },
  { value: 'replied',              label: 'Replied',              color: 'bg-yellow-900/80',  text: 'text-yellow-300' },
  { value: 'deal',                 label: 'Deal',                 color: 'bg-green-900/80',   text: 'text-green-300' },
  { value: 'pass',                 label: 'Pass',                 color: 'bg-neutral-800',    text: 'text-neutral-500' },
] as const;

const OUTREACH_STATUSES = new Set(['contacted_x', 'contacted_instagram', 'contacted_skool', 'contacted_email', 'follow_up_sent', 'replied', 'deal', 'pass']);

function pct(num: number, den: number) {
  if (den === 0) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function DrillDownModal({ title, channels, onClose }: {
  title: string;
  channels: QualifiedChannel[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {channels.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-10">No channels here yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {channels.map((ch) => (
                <li key={ch.channel_id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-800/50 transition-colors">
                  {ch.channel_thumbnail_url ? (
                    <img src={ch.channel_thumbnail_url} alt={ch.channel_name} className="h-9 w-9 rounded-full shrink-0 bg-neutral-800" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-neutral-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-100 truncate">{ch.channel_name}</p>
                    <p className="text-xs text-neutral-500 truncate">{ch.channel_handle || ch.channel_url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ch.channel_subscribers > 0 && (
                      <span className="text-xs text-neutral-500">{formatNum(ch.channel_subscribers)}</span>
                    )}
                    <a href={ch.channel_url} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-neutral-300 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-neutral-600 hover:bg-neutral-800/60 transition-colors' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-[18px] w-[18px] text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-neutral-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-neutral-600 mt-1">{sub}</p>}
      </div>
      {onClick && <p className="text-xs text-neutral-600">Click to view →</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<QualifiedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ title: string; channels: QualifiedChannel[] } | null>(null);

  useEffect(() => {
    fetch('/api/qualified')
      .then((r) => r.json())
      .then((d) => { setChannels(d.channels ?? []); setLoading(false); });
  }, []);

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = channels.filter((c) => c.outreach_status === s.value).length;
    return acc;
  }, {});

  const total = channels.length;
  const outreachSent = channels.filter((c) => OUTREACH_STATUSES.has(c.outreach_status)).length;
  const activeOutreach = outreachSent;
  const repliedChannels = channels.filter((c) => ['replied', 'deal', 'pass'].includes(c.outreach_status));
  const replied = repliedChannels.length;
  const deals = counts['deal'] ?? 0;
  const replyRate = pct(replied, activeOutreach);
  const closeRate = pct(deals, activeOutreach);

  const maxCount = Math.max(...STATUSES.map((s) => counts[s.value] ?? 0), 1);

  function open(title: string, filter: (c: QualifiedChannel) => boolean) {
    setDrill({ title, channels: channels.filter(filter) });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/qualified" className="text-neutral-500 hover:text-neutral-300 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="rounded-xl bg-indigo-600 p-2.5">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Outreach Dashboard</h1>
          <p className="text-sm text-neutral-400">Your pitch pipeline at a glance</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard icon={Users}         label="Total Qualified"  value={total}          color="bg-neutral-700"  onClick={() => open('All Qualified', () => true)} />
            <StatCard icon={Send}          label="Outreach Sent"    value={activeOutreach} color="bg-indigo-600"   onClick={() => open('Outreach Sent', (c) => OUTREACH_STATUSES.has(c.outreach_status))} />
            <StatCard icon={TrendingUp}    label="Follow-ups Sent"  value={counts['follow_up_sent'] ?? 0} color="bg-orange-600" onClick={() => open('Follow-ups Sent', (c) => c.outreach_status === 'follow_up_sent')} />
            <StatCard icon={MessageCircle} label="Replies Received" value={replied}        color="bg-yellow-600"  sub={`Reply rate: ${replyRate}`} onClick={() => open('Replies Received', (c) => ['replied', 'deal', 'pass'].includes(c.outreach_status))} />
            <StatCard icon={Handshake}     label="Deals Closed"     value={deals}          color="bg-green-600"   sub={`Close rate: ${closeRate}`} onClick={() => open('Deals Closed', (c) => c.outreach_status === 'deal')} />
            <StatCard icon={XCircle}       label="Passed"           value={counts['pass'] ?? 0} color="bg-neutral-600" onClick={() => open('Passed', (c) => c.outreach_status === 'pass')} />
          </div>

          {/* Rates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col gap-1">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Reply Rate</p>
              <p className="text-4xl font-bold text-yellow-400">{replyRate}</p>
              <p className="text-xs text-neutral-600">{replied} replies / {activeOutreach} sent</p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col gap-1">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Close Rate</p>
              <p className="text-4xl font-bold text-green-400">{closeRate}</p>
              <p className="text-xs text-neutral-600">{deals} deals / {activeOutreach} sent</p>
            </div>
          </div>

          {/* Status breakdown bar chart */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Pipeline Breakdown</h2>
            <div className="flex flex-col gap-3">
              {STATUSES.filter((s) => s.value !== 'new').map((s) => {
                const count = counts[s.value] ?? 0;
                const width = count === 0 ? 0 : Math.max(2, Math.round((count / maxCount) * 100));
                return (
                  <div key={s.value} className="flex items-center gap-3 cursor-pointer group" onClick={() => open(s.label, (c) => c.outreach_status === s.value)}>
                    <span className="w-40 shrink-0 text-xs text-neutral-400 text-right group-hover:text-neutral-200 transition-colors">{s.label}</span>
                    <div className="flex-1 h-6 rounded-lg bg-neutral-800 overflow-hidden">
                      <div className={`h-full rounded-lg ${s.color} transition-all duration-500`} style={{ width: `${width}%` }} />
                    </div>
                    <span className={`w-6 shrink-0 text-xs font-medium ${s.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {drill && <DrillDownModal title={drill.title} channels={drill.channels} onClose={() => setDrill(null)} />}
    </main>
  );
}
