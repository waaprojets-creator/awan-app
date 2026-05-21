import React from 'react';
import {
  BODY_MEASURES,
  BodyMeasureSvg,
  type BodyMeasure,
} from './BodyMeasureSvg';

export type { BodyMeasure };

// 17 standard muscle IDs (Free Exercise DB nomenclature level-1 + L/R sub-zones level-2)
export type MuscleId =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps_left' | 'biceps_right'
  | 'triceps_left' | 'triceps_right'
  | 'forearms_left' | 'forearms_right'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'lats'
  | 'back_lower'
  | 'glutes'
  | 'quads_left' | 'quads_right'
  | 'hamstrings_left' | 'hamstrings_right'
  | 'calves_left' | 'calves_right';

// ViewBox: 350×530. Front center cx=95, Back center cx=255.
// Each region: { cx, cy, rx, ry } — ellipse overlaid on silhouette.
const MUSCLE_REGIONS: Record<MuscleId, { cx: number; cy: number; rx: number; ry: number }> = {
  chest:            { cx: 95,  cy: 120, rx: 34, ry: 26 },
  front_delts:      { cx: 95,  cy: 90,  rx: 38, ry: 10 },
  side_delts:       { cx: 95,  cy: 96,  rx: 46, ry: 12 },
  rear_delts:       { cx: 255, cy: 90,  rx: 40, ry: 10 },
  abs:              { cx: 95,  cy: 175, rx: 22, ry: 36 },
  obliques:         { cx: 95,  cy: 195, rx: 36, ry: 24 },
  traps:            { cx: 255, cy: 82,  rx: 38, ry: 12 },
  lats:             { cx: 255, cy: 148, rx: 36, ry: 32 },
  back_lower:       { cx: 255, cy: 192, rx: 22, ry: 22 },
  glutes:           { cx: 255, cy: 266, rx: 32, ry: 28 },
  biceps_left:      { cx: 47,  cy: 152, rx: 9,  ry: 22 },
  biceps_right:     { cx: 143, cy: 152, rx: 9,  ry: 22 },
  triceps_left:     { cx: 207, cy: 152, rx: 9,  ry: 22 },
  triceps_right:    { cx: 303, cy: 152, rx: 9,  ry: 22 },
  forearms_left:    { cx: 47,  cy: 212, rx: 8,  ry: 20 },
  forearms_right:   { cx: 143, cy: 212, rx: 8,  ry: 20 },
  quads_left:       { cx: 88,  cy: 314, rx: 14, ry: 36 },
  quads_right:      { cx: 102, cy: 314, rx: 14, ry: 36 },
  hamstrings_left:  { cx: 248, cy: 314, rx: 14, ry: 36 },
  hamstrings_right: { cx: 262, cy: 314, rx: 14, ry: 36 },
  calves_left:      { cx: 88,  cy: 408, rx: 10, ry: 24 },
  calves_right:     { cx: 102, cy: 408, rx: 10, ry: 24 },
};

// Interpolate opacity: value 0 → 0.08, value 1 → 0.85
function valueToOpacity(v: number): number {
  const clamped = Math.min(1, Math.max(0, v));
  return 0.08 + clamped * 0.77;
}

// ─── BodySvg props ────────────────────────────────────────────────────────────

interface BodySvgHeatmapProps {
  mode: 'heatmap' | 'twin';
  muscleValues: Partial<Record<MuscleId, number>>;
  onMusclePress?: ((muscleId: MuscleId) => void) | undefined;
  highlightedMuscle?: MuscleId | undefined;
}

interface BodySvgMeasureProps {
  mode: 'measure';
  measurements: Record<string, number>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export type BodySvgProps = BodySvgHeatmapProps | BodySvgMeasureProps;

// ─── Heatmap / twin SVG ───────────────────────────────────────────────────────

function HeatmapSvg({
  muscleValues,
  onMusclePress,
  highlightedMuscle,
}: {
  muscleValues: Partial<Record<MuscleId, number>>;
  onMusclePress?: ((muscleId: MuscleId) => void) | undefined;
  highlightedMuscle?: MuscleId | undefined;
}) {
  const DIM = 'rgba(255,255,255,0.18)';

  return (
    <svg
      viewBox="0 0 350 530"
      width="100%"
      style={{ display: 'block', maxHeight: 520 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Silhouette labels */}
      <text x="95" y="510" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="monospace" fill={DIM} letterSpacing="2">FACE</text>
      <text x="255" y="510" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="monospace" fill={DIM} letterSpacing="2">DOS</text>

      {/* Silhouette outline — front */}
      <SilhouetteOutlines />

      {/* Muscle overlays */}
      {(Object.entries(MUSCLE_REGIONS) as [MuscleId, { cx: number; cy: number; rx: number; ry: number }][]).map(
        ([id, reg]) => {
          const val = muscleValues[id] ?? 0;
          const opacity = valueToOpacity(val);
          const isHighlighted = highlightedMuscle === id;
          return (
            <ellipse
              key={id}
              cx={reg.cx}
              cy={reg.cy}
              rx={reg.rx}
              ry={reg.ry}
              style={{
                fill: 'var(--color-awan-gold)',
                opacity,
                cursor: onMusclePress ? 'pointer' : 'default',
                stroke: isHighlighted ? 'var(--color-awan-gold)' : 'none',
                strokeWidth: isHighlighted ? 1.5 : 0,
              }}
              onClick={() => onMusclePress?.(id)}
            />
          );
        }
      )}
    </svg>
  );
}

// ─── Silhouette helper (shared between measure and heatmap) ───────────────────

function SilhouetteOutlines() {
  const DIM = 'rgba(255,255,255,0.18)';
  const frontCx = 95;
  const backCx  = 255;

  // Import path builders inline to avoid circular dependency
  const buildFront = (cx: number) => {
    const x = (d: number) => cx + d;
    return [
      `M ${x(-8)},56 L ${x(8)},56`,
      `L ${x(46)},72 C ${x(52)},82 ${x(54)},98 ${x(54)},108`,
      `C ${x(48)},128 ${x(38)},162 ${x(36)},194`,
      `C ${x(34)},214 ${x(38)},232 ${x(40)},248`,
      `L ${x(28)},306`,
      `C ${x(26)},346 ${x(24)},366 ${x(24)},382`,
      `L ${x(22)},418`,
      `C ${x(18)},456 ${x(16)},464 ${x(18)},472`,
      `L ${x(36)},476 ${x(36)},480 ${x(22)},482 ${x(4)},472`,
      `C ${x(2)},462 ${x(2)},450 ${x(4)},440`,
      `L ${x(4)},418`,
      `C ${x(5)},380 ${x(5)},358 ${x(6)},332`,
      `L ${x(7)},266 L ${x(-7)},266`,
      `L ${x(-6)},332`,
      `C ${x(-5)},358 ${x(-5)},380 ${x(-4)},418`,
      `L ${x(-4)},440`,
      `C ${x(-2)},450 ${x(-2)},462 ${x(-4)},472`,
      `L ${x(-22)},482 ${x(-36)},480 ${x(-36)},476 ${x(-18)},472`,
      `C ${x(-16)},464 ${x(-18)},456 ${x(-22)},418`,
      `L ${x(-24)},382`,
      `C ${x(-24)},366 ${x(-26)},346 ${x(-28)},306`,
      `L ${x(-40)},248`,
      `C ${x(-38)},232 ${x(-34)},214 ${x(-36)},194`,
      `C ${x(-38)},162 ${x(-48)},128 ${x(-54)},108`,
      `C ${x(-54)},98 ${x(-52)},82 ${x(-46)},72`,
      `L ${x(-8)},56`,
    ].join(' ');
  };

  const buildBack = (cx: number) => {
    const x = (d: number) => cx + d;
    return [
      `M ${x(-8)},56 L ${x(8)},56`,
      `L ${x(46)},70 C ${x(54)},82 ${x(56)},100 ${x(56)},108`,
      `C ${x(50)},126 ${x(40)},160 ${x(38)},194`,
      `C ${x(36)},216 ${x(40)},234 ${x(42)},250`,
      `L ${x(30)},308`,
      `C ${x(28)},348 ${x(26)},368 ${x(26)},384`,
      `L ${x(24)},420`,
      `C ${x(20)},458 ${x(18)},466 ${x(20)},474`,
      `L ${x(38)},478 ${x(38)},482 ${x(24)},484 ${x(6)},474`,
      `C ${x(4)},464 ${x(4)},452 ${x(6)},442`,
      `L ${x(6)},420`,
      `C ${x(7)},382 ${x(7)},360 ${x(8)},334`,
      `L ${x(9)},268 L ${x(-9)},268`,
      `L ${x(-8)},334`,
      `C ${x(-7)},360 ${x(-7)},382 ${x(-6)},420`,
      `L ${x(-6)},442`,
      `C ${x(-4)},452 ${x(-4)},464 ${x(-6)},474`,
      `L ${x(-24)},484 ${x(-38)},482 ${x(-38)},478 ${x(-20)},474`,
      `C ${x(-18)},466 ${x(-20)},458 ${x(-24)},420`,
      `L ${x(-26)},384`,
      `C ${x(-26)},368 ${x(-28)},348 ${x(-30)},308`,
      `L ${x(-42)},250`,
      `C ${x(-40)},234 ${x(-36)},216 ${x(-38)},194`,
      `C ${x(-40)},160 ${x(-50)},126 ${x(-56)},108`,
      `C ${x(-56)},100 ${x(-54)},82 ${x(-46)},70`,
      `L ${x(-8)},56`,
    ].join(' ');
  };

  const buildArms = (cx: number, isFront: boolean) => {
    const x = (d: number) => cx + d;
    if (isFront) {
      return [
        `M ${x(46)},72 C ${x(58)},80 ${x(62)},100 ${x(62)},120`,
        `L ${x(60)},182 C ${x(58)},202 ${x(54)},224 ${x(50)},248 L ${x(44)},276`,
        `L ${x(40)},272 C ${x(36)},248 ${x(34)},226 ${x(34)},206 L ${x(36)},140 C ${x(38)},118 ${x(44)},100 ${x(54)},108`,
        `M ${x(-46)},72 C ${x(-58)},80 ${x(-62)},100 ${x(-62)},120`,
        `L ${x(-60)},182 C ${x(-58)},202 ${x(-54)},224 ${x(-50)},248 L ${x(-44)},276`,
        `L ${x(-40)},272 C ${x(-36)},248 ${x(-34)},226 ${x(-34)},206 L ${x(-36)},140 C ${x(-38)},118 ${x(-44)},100 ${x(-54)},108`,
      ].join(' ');
    }
    return [
      `M ${x(46)},70 C ${x(60)},78 ${x(64)},100 ${x(64)},120`,
      `L ${x(62)},184 C ${x(60)},204 ${x(56)},226 ${x(52)},250 L ${x(46)},278`,
      `L ${x(42)},274 C ${x(38)},250 ${x(36)},228 ${x(36)},208 L ${x(38)},142 C ${x(40)},120 ${x(46)},102 ${x(56)},108`,
      `M ${x(-46)},70 C ${x(-60)},78 ${x(-64)},100 ${x(-64)},120`,
      `L ${x(-62)},184 C ${x(-60)},204 ${x(-56)},226 ${x(-52)},250 L ${x(-46)},278`,
      `L ${x(-42)},274 C ${x(-38)},250 ${x(-36)},228 ${x(-36)},208 L ${x(-38)},142 C ${x(-40)},120 ${x(-46)},102 ${x(-56)},108`,
    ].join(' ');
  };

  return (
    <>
      {[
        { cx: frontCx, isFront: true },
        { cx: backCx,  isFront: false },
      ].map(({ cx, isFront }) => (
        <g key={cx}>
          <ellipse cx={cx} cy={32} rx={20} ry={23} fill="none" stroke={DIM} strokeWidth={1.2} />
          <path d={isFront ? buildFront(cx) : buildBack(cx)} fill="none" stroke={DIM} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={buildArms(cx, isFront)} fill="none" stroke={DIM} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={`M ${cx},56 L ${cx},266`} fill="none" stroke={DIM} strokeWidth={0.6} strokeDasharray="3,4" />
        </g>
      ))}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function BodySvg(props: BodySvgProps) {
  if (props.mode === 'measure') {
    return (
      <BodyMeasureSvg
        measurements={props.measurements}
        selectedKey={props.selectedKey}
        onSelect={props.onSelect}
      />
    );
  }
  return (
    <HeatmapSvg
      muscleValues={props.muscleValues}
      onMusclePress={props.onMusclePress ?? undefined}
      highlightedMuscle={props.highlightedMuscle ?? undefined}
    />
  );
}

// Re-export for convenience
export { BODY_MEASURES };
