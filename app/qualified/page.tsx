'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ArrowLeft, Download, Plus } from 'lucide-react';
import Link from 'next/link';
import QualifiedTable from '@/components/QualifiedTable';
import AddLeadModal from '@/components/AddLeadModal';
import type { QualifiedChannel, OutreachStatus } from '@/lib/types';

function exportCsv(channels: QualifiedChannel[]) {
  const headers = ['Channel', 'Handle', 'Channel URL', 'Subscribers', 'Country', 'Email', 'Twitter/X', 'Instagram', 'Status', 'Notes', 'Qualified At'];
  const rows = channels.map((ch) => [
    `"${ch.channel_name.replace(/"/g, '""')}"`,
    ch.channel_handle,
    ch.channel_url,
    ch.channel_subscribers,
    ch.channel_country,
    ch.contact_email,
    ch.twitter_url,
    ch.instagram_url,
    ch.outreach_status,
    `"${ch.notes.replace(/"/g, '""')}"`,
    ch.qualified_at.slice(0, 10),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qualified-leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const ALL_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-neutral-700 text-neutral-200' },
  { value: 'contacted_x', label: 'Contacted in X', color: 'bg-sky-900/60 text-sky-300' },
  { value: 'contacted_instagram', label: 'Contacted Instagram', color: 'bg-pink-900/60 text-pink-300' },
  { value: 'contacted_skool', label: 'Contacted in Skool', color: 'bg-purple-900/60 text-purple-300' },
  { value: 'contacted_email', label: 'Contacted in Email', color: 'bg-blue-900/60 text-blue-300' },
  { value: 'follow_up_sent', label: 'Follow Up Sent', color: 'bg-orange-900/60 text-orange-300' },
  { value: 'replied', label: 'Replied', color: 'bg-yellow-900/60 text-yellow-300' },
  { value: 'deal', label: 'Deal', color: 'bg-green-900/60 text-green-300' },
  { value: 'pass', label: 'Pass', color: 'bg-neutral-800 text-neutral-500' },
] as const;

export default function QualifiedPage() {
  const [channels, setChannels] = useState<QualifiedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetch('/api/qualified')
      .then((r) => r.json())
      .then((d) => {
        setChannels(d.channels ?? []);
        setLoading(false);
      });
  }, []);

  const handleStatusChange = useCallback(async (channelId: string, status: OutreachStatus) => {
    const res = await fetch(`/api/qualified/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreach_status: status }),
    });
    if (res.ok) {
      const data = await res.json();
      setChannels((prev) => prev.map((ch) => ch.channel_id === channelId ? data.channel : ch));
    }
  }, []);

  const handleRemove = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/qualified/${channelId}`, { method: 'DELETE' });
    if (res.ok) {
      setChannels((prev) => prev.filter((ch) => ch.channel_id !== channelId));
    }
  }, []);

  const filtered = statusFilter === 'all' ? channels : channels.filter((ch) => ch.outreach_status === statusFilter);

  const countsByStatus = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = channels.filter((ch) => ch.outreach_status === s.value).length;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="rounded-xl bg-yellow-600 p-2.5">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Qualified Leads</h1>
          </div>
          <p className="text-sm text-neutral-400 ml-14">
            Channels you've qualified for outreach. Track your pitch pipeline here.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-yellow-600 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Lead
          </button>
          <button
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      {channels.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="rounded-xl px-4 py-2 text-sm font-medium bg-neutral-800 text-neutral-200">
            Total: {channels.length}
          </div>
          {ALL_STATUSES.filter((s) => countsByStatus[s.value] > 0).map((s) => (
            <div key={s.value} className={`rounded-xl px-4 py-2 text-sm font-medium ${s.color}`}>
              {s.label}: {countsByStatus[s.value]}
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {channels.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}>
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s.value ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <QualifiedTable
          channels={filtered}
          onStatusChange={handleStatusChange}
          onRemove={handleRemove}
        />
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdd={(ch) => setChannels((prev) => [ch, ...prev])}
        />
      )}
    </main>
  );
}
