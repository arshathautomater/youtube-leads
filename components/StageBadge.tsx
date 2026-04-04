import type { ProductionStage } from '@/lib/types';

const STAGE_CONFIG: Record<ProductionStage, { label: string; color: string }> = {
  cutting:        { label: 'Cutting',       color: 'bg-neutral-700 text-neutral-300' },
  editing:        { label: 'Editing',       color: 'bg-blue-900/60 text-blue-300' },
  intro_editing:  { label: 'Intro Editing', color: 'bg-indigo-900/60 text-indigo-300' },
  sfx:            { label: 'SFX',           color: 'bg-purple-900/60 text-purple-300' },
  final_checking: { label: 'Final Check',   color: 'bg-yellow-900/60 text-yellow-300' },
  completed:      { label: 'Completed',     color: 'bg-green-900/60 text-green-300' },
};

export { STAGE_CONFIG };

export default function StageBadge({ stage }: { stage: ProductionStage }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
