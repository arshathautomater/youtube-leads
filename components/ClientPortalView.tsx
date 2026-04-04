'use client';

import { Calendar, Film } from 'lucide-react';
import StageBadge from './StageBadge';
import StageProgressBar from './StageProgressBar';
import type { ClientProject } from '@/lib/types';

function formatDate(d: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ClientPortalView({ clientName, projects }: { clientName: string; projects: ClientProject[] }) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-2.5">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Video Production Status</p>
            <h1 className="text-xl font-bold text-white">{clientName}</h1>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-5">
        {projects.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-sm">No projects yet — check back soon.</div>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
              {/* Thumbnail */}
              {p.thumbnail_url && (
                <div className="w-full aspect-video bg-neutral-800 overflow-hidden">
                  <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 flex flex-col gap-4">
                {/* Title + stage */}
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-white text-base leading-snug">{p.title}</h2>
                  <StageBadge stage={p.stage} />
                </div>

                {/* Progress bar */}
                <StageProgressBar stage={p.stage} />

                {/* Delivery date */}
                {p.delivery_date && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Estimated delivery: <span className="text-neutral-200 font-medium">{formatDate(p.delivery_date)}</span></span>
                  </div>
                )}

                {/* Notes */}
                {p.notes && (
                  <p className="text-sm text-neutral-400 leading-relaxed border-t border-neutral-800 pt-3">{p.notes}</p>
                )}
              </div>
            </div>
          ))
        )}

        <p className="text-center text-xs text-neutral-700 mt-4">Questions? Reach out to your editor directly.</p>
      </div>
    </main>
  );
}
