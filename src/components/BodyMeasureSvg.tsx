import React from 'react';
import { useTheme } from '../hooks/useTheme';

export interface BodyMeasure {
  key: string;
  label: string;
  unit?: string;
}

export const BODY_MEASURES: BodyMeasure[] = [
  { key: 'neck',          label: 'COU',         unit: 'cm' },
  { key: 'shoulders',     label: 'ÉPAULES',     unit: 'cm' },
  { key: 'chest',         label: 'POITRINE',    unit: 'cm' },
  { key: 'arm_right',     label: 'BRAS',        unit: 'cm' },
  { key: 'forearm_right', label: 'AVANT-BRAS',  unit: 'cm' },
  { key: 'waist',         label: 'TAILLE',      unit: 'cm' },
  { key: 'hips',          label: 'HANCHES',     unit: 'cm' },
  { key: 'thigh_right',   label: 'CUISSE',      unit: 'cm' },
  { key: 'calf_right',    label: 'MOLLET',      unit: 'cm' },
];

// y-position and x-spans for each measure line on front (cx=95) and back (cx=255)
// All values in viewBox coordinates (0 0 350 530)
const MEASURE_LINES: Record<string, { y: number; frontX: [number, number]; backX: [number, number] }> = {
  neck:          { y: 72,  frontX: [82,  108], backX: [232, 258] },
  shoulders:     { y: 88,  frontX: [42,  148], backX: [202, 308] },
  chest:         { y: 128, frontX: [52,  138], backX: [212, 298] },
  arm_right:     { y: 150, frontX: [140, 160], backX: [300, 320] },
  forearm_right: { y: 212, frontX: [136, 154], backX: [296, 314] },
  waist:         { y: 194, frontX: [60,  130], backX: [220, 290] },
  hips:          { y: 232, frontX: [54,  136], backX: [214, 296] },
  thigh_right:   { y: 302, frontX: [95,  122], backX: [255, 282] },
  calf_right:    { y: 408, frontX: [98,  118], backX: [258, 278] },
};

// ─── Silhouette paths (viewBox 0 0 350 530) ───────────────────────────────────
// Front body: centered at cx=95, back body: centered at cx=255

const FRONT_HEAD = (cx: number) =>
  `M ${cx} 25 a 20,23 0 1 1 0.01,0 Z`;

// Front torso + legs (closed path, stroke only)
function frontBodyPath(cx: number): string {
  const x = (d: number) => cx + d;
  return [
    // neck → right shoulder
    `M ${x(-8)},56 L ${x(8)},56`,
    `L ${x(46)},72 C ${x(52)},82 ${x(54)},98 ${x(54)},108`,  // right armpit
    // right torso side: chest → waist → hip
    `C ${x(48)},128 ${x(38)},162 ${x(36)},194`,
    `C ${x(34)},214 ${x(38)},232 ${x(40)},248`,
    // right outer thigh
    `L ${x(28)},306`,
    // right outer knee
    `C ${x(26)},346 ${x(24)},366 ${x(24)},382`,
    // right outer calf
    `L ${x(22)},418`,
    // right outer ankle → foot
    `C ${x(18)},456 ${x(16)},464 ${x(18)},472`,
    `L ${x(36)},476 ${x(36)},480 ${x(22)},482 ${x(4)},472`,
    // right inner ankle
    `C ${x(2)},462 ${x(2)},450 ${x(4)},440`,
    `L ${x(4)},418`,
    // right inner calf → inner knee → inner thigh
    `C ${x(5)},380 ${x(5)},358 ${x(6)},332`,
    `L ${x(7)},266`,
    // crotch
    `L ${x(-7)},266`,
    // left inner thigh → knee → calf → ankle
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
}

// Arms (separate paths, not closed — just stroked outline)
function frontArmsPath(cx: number): string {
  const x = (d: number) => cx + d;
  return [
    // Right arm outer
    `M ${x(46)},72 C ${x(58)},80 ${x(62)},100 ${x(62)},120`,
    `L ${x(60)},182 C ${x(58)},202 ${x(54)},224 ${x(50)},248`,
    `L ${x(44)},276`,
    // Right arm inner (back toward body)
    `L ${x(40)},272 C ${x(36)},248 ${x(34)},226 ${x(34)},206`,
    `L ${x(36)},140 C ${x(38)},118 ${x(44)},100 ${x(54)},108`,
    // Left arm outer
    `M ${x(-46)},72 C ${x(-58)},80 ${x(-62)},100 ${x(-62)},120`,
    `L ${x(-60)},182 C ${x(-58)},202 ${x(-54)},224 ${x(-50)},248`,
    `L ${x(-44)},276`,
    // Left arm inner
    `L ${x(-40)},272 C ${x(-36)},248 ${x(-34)},226 ${x(-34)},206`,
    `L ${x(-36)},140 C ${x(-38)},118 ${x(-44)},100 ${x(-54)},108`,
  ].join(' ');
}

// Back body is similar but with slightly different shoulder/hip curve
function backBodyPath(cx: number): string {
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
    `L ${x(9)},268`,
    `L ${x(-9)},268`,
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
}

function backArmsPath(cx: number): string {
  const x = (d: number) => cx + d;
  return [
    `M ${x(46)},70 C ${x(60)},78 ${x(64)},100 ${x(64)},120`,
    `L ${x(62)},184 C ${x(60)},204 ${x(56)},226 ${x(52)},250`,
    `L ${x(46)},278`,
    `L ${x(42)},274 C ${x(38)},250 ${x(36)},228 ${x(36)},208`,
    `L ${x(38)},142 C ${x(40)},120 ${x(46)},102 ${x(56)},108`,
    `M ${x(-46)},70 C ${x(-60)},78 ${x(-64)},100 ${x(-64)},120`,
    `L ${x(-62)},184 C ${x(-60)},204 ${x(-56)},226 ${x(-52)},250`,
    `L ${x(-46)},278`,
    `L ${x(-42)},274 C ${x(-38)},250 ${x(-36)},228 ${x(-36)},208`,
    `L ${x(-38)},142 C ${x(-40)},120 ${x(-46)},102 ${x(-56)},108`,
  ].join(' ');
}

// ─── Spine / symmetry line ────────────────────────────────────────────────────
const SPINE = (cx: number) => `M ${cx},56 L ${cx},266`;

interface Props {
  measurements: Record<string, number>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

const DIM = 'rgba(255,255,255,0.18)';

export function BodyMeasureSvg({ measurements, selectedKey, onSelect }: Props) {
  const theme = useTheme();
  const GOLD = theme.selected;
  const TX   = theme.title;
  const FRONT_CX = 95;
  const BACK_CX  = 255;

  return (
    <svg
      viewBox="0 0 350 530"
      width="100%"
      style={{ display: 'block', maxHeight: 520 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* ─── LABELS ─── */}
      <text x="95" y="510" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="monospace" fill={DIM} letterSpacing="2">FACE</text>
      <text x="255" y="510" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="monospace" fill={DIM} letterSpacing="2">DOS</text>

      {/* ─── SILHOUETTES ─── */}
      {[
        { cx: FRONT_CX, body: frontBodyPath(FRONT_CX), arms: frontArmsPath(FRONT_CX), spine: SPINE(FRONT_CX) },
        { cx: BACK_CX,  body: backBodyPath(BACK_CX),   arms: backArmsPath(BACK_CX),   spine: SPINE(BACK_CX) },
      ].map(({ cx, body, arms, spine }) => (
        <g key={cx}>
          {/* Head */}
          <ellipse cx={cx} cy={32} rx={20} ry={23} fill="none" stroke={DIM} strokeWidth={1.2} />
          {/* Body */}
          <path d={body} fill="none" stroke={DIM} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
          {/* Arms */}
          <path d={arms} fill="none" stroke={DIM} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
          {/* Spine dashed */}
          <path d={spine} fill="none" stroke={DIM} strokeWidth={0.6} strokeDasharray="3,4" />
        </g>
      ))}

      {/* ─── MEASURE LINES ─── */}
      {BODY_MEASURES.map(({ key, label }) => {
        const line = MEASURE_LINES[key];
        if (!line) return null;
        const isSelected = selectedKey === key;
        const val = measurements[key];
        const hasVal = val !== undefined && val > 0;
        const active = isSelected || hasVal;
        const color = active ? GOLD : DIM;
        const labelColor = isSelected ? GOLD : hasVal ? TX : DIM;
        const strokeW = isSelected ? 1.8 : 1.2;
        const dashArray = isSelected ? 'none' : '4,3';

        return (
          <g
            key={key}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(key)}
          >
            {/* Invisible hit area */}
            <line
              x1={line.frontX[0] - 2} y1={line.y}
              x2={line.backX[1] + 2}  y2={line.y}
              stroke="transparent" strokeWidth={16}
            />

            {/* Front line */}
            <line
              x1={line.frontX[0]} y1={line.y}
              x2={line.frontX[1]} y2={line.y}
              stroke={color} strokeWidth={strokeW}
              strokeDasharray={dashArray}
              strokeLinecap="round"
            />
            {/* Back line */}
            <line
              x1={line.backX[0]} y1={line.y}
              x2={line.backX[1]} y2={line.y}
              stroke={color} strokeWidth={strokeW}
              strokeDasharray={dashArray}
              strokeLinecap="round"
            />

            {/* End caps */}
            <circle cx={line.frontX[0]} cy={line.y} r={isSelected ? 2.5 : 1.5} fill={color} />
            <circle cx={line.frontX[1]} cy={line.y} r={isSelected ? 2.5 : 1.5} fill={color} />
            <circle cx={line.backX[0]}  cy={line.y} r={isSelected ? 2.5 : 1.5} fill={color} />
            <circle cx={line.backX[1]}  cy={line.y} r={isSelected ? 2.5 : 1.5} fill={color} />

            {/* Label + value (center between the two bodies) */}
            <text
              x="175" y={line.y + 4}
              textAnchor="middle"
              fontSize={isSelected ? 7.5 : 6.5}
              fontWeight="900"
              fontFamily="monospace"
              fill={labelColor}
              letterSpacing="1"
            >
              {hasVal ? `${label} ${val}cm` : label}
            </text>

            {/* Connector lines from label to body lines */}
            <line x1={line.frontX[1] + 1} y1={line.y} x2={168} y2={line.y} stroke={color} strokeWidth={0.4} strokeDasharray="2,3" />
            <line x1={182} y1={line.y} x2={line.backX[0] - 1} y2={line.y} stroke={color} strokeWidth={0.4} strokeDasharray="2,3" />

            {/* Gold highlight bar when selected */}
            {isSelected && (
              <rect
                x={line.frontX[0] - 1} y={line.y - 4}
                width={line.frontX[1] - line.frontX[0] + 2} height={8}
                fill={GOLD} fillOpacity={0.15} rx={1}
              />
            )}
            {isSelected && (
              <rect
                x={line.backX[0] - 1} y={line.y - 4}
                width={line.backX[1] - line.backX[0] + 2} height={8}
                fill={GOLD} fillOpacity={0.15} rx={1}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
