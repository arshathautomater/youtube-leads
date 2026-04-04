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
    <div className="flex items-start w-full gap-0">
      {STAGES.map((s, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === STAGES.length - 1;
        return (
          <div key={s.value} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
                isDone    ? 'bg-indigo-500 border-indigo-500' :
                isCurrent ? 'bg-white border-white ring-2 ring-white/20 ring-offset-1 ring-offset-neutral-900' :
                            'bg-transparent border-neutral-600'
              }`} />
              <span className={`text-[9px] font-medium leading-none whitespace-nowrap ${
                isCurrent ? 'text-white' : isDone ? 'text-indigo-400' : 'text-neutral-600'
              }`}>{s.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-px mb-3 mx-0.5 transition-colors duration-300 ${
                isDone ? 'bg-indigo-500' : 'bg-neutral-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
