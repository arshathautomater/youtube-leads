import type { ProductionStage } from '@/lib/types';

const STAGES: { value: ProductionStage; label: string }[] = [
  { value: 'cutting',        label: 'Cutting' },
  { value: 'editing',        label: 'Editing' },
  { value: 'intro_editing',  label: 'Intro' },
  { value: 'sfx',            label: 'SFX' },
  { value: 'final_checking', label: 'Final Check' },
  { value: 'completed',      label: 'Done' },
];

export default function StageProgressBar({ stage }: { stage: ProductionStage }) {
  const currentIdx = STAGES.findIndex((s) => s.value === stage);

  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((s, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === STAGES.length - 1;
        return (
          <div key={s.value} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className={`h-2 w-full rounded-sm transition-colors ${
                isDone ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-neutral-700'
              }`} />
              <span className={`text-[9px] mt-1 truncate font-medium ${
                isCurrent ? 'text-blue-400' : isDone ? 'text-green-500' : 'text-neutral-600'
              }`}>{s.label}</span>
            </div>
            {!isLast && <div className="w-px h-2 bg-neutral-800 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}
