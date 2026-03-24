'use client';

import type { PitchStatus } from '@/lib/types';

const STATUS_CYCLE: PitchStatus[] = ['not_pitched', 'contacted', 'replied', 'closed'];

const STATUS_STYLES: Record<PitchStatus, string> = {
  not_pitched: 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700',
  contacted:   'bg-blue-900/60 text-blue-300 hover:bg-blue-800/60',
  replied:     'bg-yellow-900/60 text-yellow-300 hover:bg-yellow-800/60',
  closed:      'bg-green-900/60 text-green-300 hover:bg-green-800/60',
};

const STATUS_LABELS: Record<PitchStatus, string> = {
  not_pitched: 'New',
  contacted:   'Contacted',
  replied:     'Replied',
  closed:      'Closed',
};

interface Props {
  status: PitchStatus;
  onChange: (next: PitchStatus) => void;
  disabled?: boolean;
}

export default function StatusBadge({ status, onChange, disabled }: Props) {
  function handleClick() {
    const idx = STATUS_CYCLE.indexOf(status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onChange(next);
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}
