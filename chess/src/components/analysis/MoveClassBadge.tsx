import type { MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/constants/classification';

interface MoveClassBadgeProps {
  classification: MoveClassification;
  size?: 'sm' | 'md';
}

export function MoveClassBadge({ classification, size = 'sm' }: MoveClassBadgeProps) {
  const meta = CLASSIFICATION_META[classification];
  if (!meta.symbol) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold ${
        size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm px-1.5 py-0.5'
      }`}
      style={{ color: meta.color, backgroundColor: meta.bgColor }}
      title={meta.label}
    >
      {meta.symbol}
    </span>
  );
}
