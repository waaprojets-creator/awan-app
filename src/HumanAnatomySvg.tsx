import React from 'react';
import { BodySvg, type MuscleId } from '@/components/BodySvg';

interface HumanAnatomySvgProps {
  muscleValues?: Partial<Record<MuscleId, number>> | undefined;
  onPartPress?: ((partId: string) => void) | undefined;
  highlightedMuscle?: MuscleId | undefined;
}

export function HumanAnatomySvg({
  muscleValues = {},
  onPartPress,
  highlightedMuscle,
}: HumanAnatomySvgProps) {
  const handlePress = onPartPress ? (id: MuscleId) => onPartPress(id) : undefined;
  return (
    <BodySvg
      mode="heatmap"
      muscleValues={muscleValues}
      onMusclePress={handlePress}
      highlightedMuscle={highlightedMuscle}
    />
  );
}
