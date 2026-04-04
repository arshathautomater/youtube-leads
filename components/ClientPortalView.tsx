'use client';

import { Film } from 'lucide-react';
import Link from 'next/link';
import StageBadge from './StageBadge';
import StageProgressBar from './StageProgressBar';
import CountdownTimer from './CountdownTimer';
import type { ClientProject } from '@/lib/types';

function isIso(s: string) {
  return s && !isNaN(new Date(s).getTime()) && s.includes('T');
}

export default function ClientPortalView({ clientName, projects }: { clientName: string; projects: ClientProject[] }) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800/60 bg-neutral-900/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-2">
            <Film className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium">Production Status</p>
            <h1 className="text-base font-semibold text-white leading-tight">{clientName}</h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      {projects.length > 0 && (() => {
        const completed = projects.filter(p => p.stage === 'completed');
        const totalHours = completed.reduce((sum, p) => sum + (p.duration_hours || 0), 0);
        return (
          <div className="border-b border-neutral-800/60 bg-neutral-900/20">
            <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">{completed.length}</span>
                <span className="text-xs text-neutral-500 mt-0.5">Videos completed</span>
              </div>
              <div className="w-px h-8 bg-neutral-800" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">{projects.length}</span>
                <span className="text-xs text-neutral-500 mt-0.5">Total videos</span>
              </div>
              {totalHours > 0 && (
                <>
                  <div className="w-px h-8 bg-neutral-800" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">{totalHours}h</span>
                    <span className="text-xs text-neutral-500 mt-0.5">Hours of editing</span>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Projects */}
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-4">
        {projects.length === 0 ? (
          <div className="text-center py-20 text-neutral-600 text-sm">No projects yet — check back soon.</div>
        ) : (
          projects.map((p) => (
            <Link
              key={p.id}
              href={p.token ? `/v/${p.token}` : '#'}
              className="group block rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors overflow-hidden"
            >
              {/* Thumbnail */}
              {p.thumbnail_url && (
                <div className="w-full aspect-video bg-neutral-800 overflow-hidden">
                  <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                </div>
              )}

              <div className="p-5 flex flex-col gap-4">
                {/* Title + stage */}
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-white text-sm leading-snug">{p.title}</h2>
                  <StageBadge stage={p.stage} />
                </div>

                {/* Progress */}
                <StageProgressBar stage={p.stage} />

                {/* Countdown */}
                {p.delivery_date && isIso(p.delivery_date) && (
                  <CountdownTimer deadline={p.delivery_date} />
                )}

                {/* Notes */}
                {p.notes && (
                  <p className="text-xs text-neutral-500 leading-relaxed border-t border-neutral-800 pt-3">{p.notes}</p>
                )}
              </div>
            </Link>
          ))
        )}

        <p className="text-center text-xs text-neutral-800 mt-4">Questions? Reach out to your editor directly.</p>
      </div>
    </main>
  );
}
