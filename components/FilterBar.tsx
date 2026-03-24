'use client';

import { Download } from 'lucide-react';
import type { Video } from '@/lib/types';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'not_pitched', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
];

const DATE_FILTERS = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function exportCsv(videos: Video[]) {
  const headers = [
    'Title', 'Video URL', 'Views', 'Likes', 'Comments', 'Published',
    'Channel', 'Handle', 'Channel URL', 'Channel Subs', 'Country',
    'Email', 'Twitter/X', 'Instagram', 'Status', 'Notes'
  ];
  const rows = videos.map((v) => [
    `"${v.title.replace(/"/g, '""')}"`,
    v.video_url,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.published_at.slice(0, 10),
    `"${v.channel_name.replace(/"/g, '""')}"`,
    v.channel_handle,
    v.channel_url,
    v.channel_subscribers,
    v.channel_country,
    v.contact_email,
    v.twitter_url,
    v.instagram_url,
    v.pitch_status,
    `"${v.notes.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'youtube-leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  status: string;
  onStatusChange: (s: string) => void;
  dateFilter: string;
  onDateFilterChange: (d: string) => void;
  minSubs: number;
  maxSubs: number;
  onMinSubsChange: (n: number) => void;
  onMaxSubsChange: (n: number) => void;
  videos: Video[];
}

export default function FilterBar({
  status, onStatusChange,
  dateFilter, onDateFilterChange,
  minSubs, maxSubs, onMinSubsChange, onMaxSubsChange,
  videos,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      {/* Row 1: status tabs + export */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => onStatusChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === tab.value
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => exportCsv(videos)} disabled={videos.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Row 2: date filter tabs */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500 shrink-0">Published</span>
        <div className="flex gap-1">
          {DATE_FILTERS.map((f) => (
            <button key={f.value} onClick={() => onDateFilterChange(f.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                dateFilter === f.value
                  ? 'bg-red-900/60 text-red-300'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: subscriber range */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-neutral-500 shrink-0">Ch. Subs</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 w-10 text-right">{formatSubs(minSubs)}</span>
            <input type="range" min={0} max={500000} step={1000} value={minSubs}
              onChange={(e) => onMinSubsChange(Number(e.target.value))}
              className="w-28 accent-red-500" />
          </div>
          <span className="text-neutral-600 text-xs">to</span>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={10000000} step={10000} value={maxSubs}
              onChange={(e) => onMaxSubsChange(Number(e.target.value))}
              className="w-28 accent-red-500" />
            <span className="text-xs text-neutral-400 w-12">{formatSubs(maxSubs)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
