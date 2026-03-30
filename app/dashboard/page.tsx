'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Send, MessageCircle, Handshake, Users, XCircle } from 'lucide-react';
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

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-neutral-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-neutral-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<QualifiedChannel[]>([]);
  const [loading, setLoading] = useState(true);

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
  const activeOutreach = outreachSent - (counts['pass'] ?? 0);
  const replied = (counts['replied'] ?? 0) + (counts['deal'] ?? 0);
  const deals = counts['deal'] ?? 0;
  const replyRate = pct(replied, activeOutreach);
  const closeRate = pct(deals, activeOutreach);

  const maxCount = Math.max(...STATUSES.map((s) => counts[s.value] ?? 0), 1);

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
            <StatCard icon={Users}         label="Total Qualified"   value={total}           color="bg-neutral-700" />
            <StatCard icon={Send}          label="Outreach Sent"     value={activeOutreach}  sub="excl. Pass"       color="bg-indigo-600" />
            <StatCard icon={TrendingUp}    label="Follow-ups Sent"   value={counts['follow_up_sent'] ?? 0}          color="bg-orange-600" />
            <StatCard icon={MessageCircle} label="Replies Received"  value={replied}         sub={`Reply rate: ${replyRate}`}  color="bg-yellow-600" />
            <StatCard icon={Handshake}     label="Deals Closed"      value={deals}           sub={`Close rate: ${closeRate}`}  color="bg-green-600" />
            <StatCard icon={XCircle}       label="Passed"            value={counts['pass'] ?? 0}                    color="bg-neutral-600" />
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
                  <div key={s.value} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-xs text-neutral-400 text-right">{s.label}</span>
                    <div className="flex-1 h-6 rounded-lg bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-lg ${s.color} transition-all duration-500`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className={`w-6 shrink-0 text-xs font-medium ${s.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
