import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { L } from '../constants/labels';

function useWindowDimensions() {
  const [dims, setDims] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return dims;
}

interface Node { id: string; label: string; x: number; y: number; tier: 0 | 1 | 2; }

const nav = (L as any).nav as Record<string, string | undefined>;
const n = (k: string): string => nav[k] ?? k;

// Dashboard at (50,52) — center-ish
// Islam (82,14) top-right, Sante (22,14) top-left
// Sport/Nutrition/Mensuration far-left column, equidistant y=28/44/60
// Reglages (88,52) horizontal right of Dashboard
// Coach (12,52) horizontal left of Dashboard
// Journal/Planning/Trajet spread at bottom, Tasks below Planning
const NODES: Node[] = [
  { id: 'Dashboard',   label: n('hub'),        x: 50, y: 52, tier: 0 },
  { id: 'Islam',       label: n('spirit'),     x: 82, y: 14, tier: 1 },
  { id: 'Sante',       label: n('sante'),      x: 22, y: 14, tier: 1 },
  { id: 'Sport',       label: n('sport'),      x:  8, y: 28, tier: 2 },
  { id: 'Nutrition',   label: n('nutrition'),  x:  8, y: 44, tier: 2 },
  { id: 'Mensuration', label: n('mensuration'),x:  8, y: 60, tier: 2 },
  { id: 'Reglages',    label: n('reglages'),   x: 88, y: 52, tier: 2 },
  { id: 'Coach',       label: n('coach'),      x: 12, y: 52, tier: 2 },
  { id: 'Journal',     label: n('journal'),    x: 18, y: 80, tier: 1 },
  { id: 'Planning',    label: n('planning'),   x: 50, y: 82, tier: 1 },
  { id: 'Tasks',       label: n('tasks'),      x: 62, y: 90, tier: 2 },
  { id: 'Trajet',      label: n('trajet'),     x: 82, y: 80, tier: 1 },
];

const EDGES: [string, string][] = [
  ['Dashboard', 'Islam'],
  ['Dashboard', 'Sante'],
  ['Dashboard', 'Reglages'],
  ['Dashboard', 'Coach'],
  ['Dashboard', 'Journal'],
  ['Dashboard', 'Planning'],
  ['Dashboard', 'Trajet'],
  ['Sante', 'Sport'],
  ['Sante', 'Nutrition'],
  ['Sante', 'Mensuration'],
  ['Planning', 'Tasks'],
];

function FullMoon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="9"  cy="9"  r="1.8" stroke={color} strokeWidth="0.7" fill="none" opacity={0.35} />
      <circle cx="15" cy="7"  r="1.1" stroke={color} strokeWidth="0.6" fill="none" opacity={0.28} />
      <circle cx="15" cy="14" r="1.4" stroke={color} strokeWidth="0.6" fill="none" opacity={0.30} />
      <circle cx="8"  cy="15" r="0.7" stroke={color} strokeWidth="0.5" fill="none" opacity={0.25} />
    </svg>
  );
}

// Thin crescent (first-day C shape) — outer circle r=9 center (12,12),
// inner circle r=7 center (14,12), evenodd fill creates crescent on left opening right
function CrescentMoon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        fill={color}
        d="M 3 12 A 9 9 0 1 0 21 12 A 9 9 0 1 1 3 12 Z M 7 12 A 7 7 0 1 0 21 12 A 7 7 0 1 1 7 12 Z"
      />
    </svg>
  );
}

const MARGIN = 14;

interface MoonMenuProps { onNavigate: (route: string) => void; currentRoute: string; }

export function MoonMenu({ onNavigate, currentRoute }: MoonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { width: W, height: H } = useWindowDimensions();
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const handleNavigate = useCallback((route: string) => {
    setIsOpen(false);
    setTimeout(() => onNavigate(route), 200);
  }, [onNavigate]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const CH = H * 0.86;

  function labelPos(node: Node) {
    const cx = (node.x / 100) * W;
    const cy = (node.y / 100) * CH;
    const r  = node.tier === 0 ? 5 : node.tier === 1 ? 3.5 : 2.5;

    if (node.y > 75) return { textX: cx, textY: cy - r - 8, anchor: 'middle' };
    if (node.x > 72) return { textX: Math.min(W - MARGIN, cx - r - 6), textY: cy - 2, anchor: 'end' };
    if (node.x < 18) return { textX: Math.max(MARGIN, cx + r + 6), textY: cy - 2, anchor: 'start' };
    if (node.tier === 0) return { textX: cx, textY: cy - r - 12, anchor: 'middle' };
    if (node.x < 40) return { textX: cx - r - 6, textY: cy - 2, anchor: 'end' };
    if (node.x > 60) return { textX: cx + r + 6, textY: cy - 2, anchor: 'start' };
    return { textX: cx, textY: cy + r + 15, anchor: 'middle' };
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.88)' }}
            onClick={() => setIsOpen(false)}
          >
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} onClick={(e) => e.stopPropagation()}>
              {EDGES.map(([fromId, toId], i) => {
                const from = NODES.find((nd) => nd.id === fromId)!;
                const to   = NODES.find((nd) => nd.id === toId)!;
                return (
                  <motion.line key={`${fromId}-${toId}`}
                    x1={(from.x/100)*W} y1={(from.y/100)*CH} x2={(to.x/100)*W} y2={(to.y/100)*CH}
                    stroke="rgba(212,175,55,0.22)" strokeWidth={1.6} strokeDasharray="3 5"
                    initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.05 + i * 0.024, ease: 'easeOut' }}
                  />
                );
              })}
              {NODES.map((node, i) => {
                const cx = (node.x/100)*W, cy = (node.y/100)*CH;
                const isActive = currentRoute === node.id;
                const isTier0  = node.tier === 0;
                const r = isTier0 ? 5 : node.tier === 1 ? 3.5 : 2.5;
                const delay = 0.12 + i * 0.04;
                const { textX, textY, anchor } = labelPos(node);
                const lColor = isActive ? 'var(--color-awan-gold)' : isTier0 ? 'rgba(255,255,255,0.92)' : node.tier === 1 ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.42)';
                const fSize = isTier0 ? 15 : node.tier === 1 ? 12 : 11;
                const fWeight = isTier0 ? 800 : node.tier === 1 ? 700 : 600;
                return (
                  <g key={node.id} onClick={() => handleNavigate(node.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={24} fill="transparent" />
                    {(isTier0 || isActive) && (
                      <motion.circle cx={cx} cy={cy} r={r+7} fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.18)" strokeWidth={0.6}
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay, duration: 0.4 }} />
                    )}
                    <motion.circle cx={cx} cy={cy} r={r}
                      fill={isActive ? 'var(--color-awan-gold)' : isTier0 ? 'rgba(212,175,55,0.9)' : node.tier===1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay, duration: 0.28, type: 'spring', stiffness: 320 }} />
                    <motion.text x={textX} y={textY} textAnchor={anchor as any} fill={lColor} fontSize={fSize}
                      fontFamily="var(--font-sans)" fontWeight={fWeight} letterSpacing="0.12em"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay+0.1, duration: 0.25 }}>
                      {node.label}
                    </motion.text>
                  </g>
                );
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button onClick={toggle}
        style={{ position: 'fixed', left: 20, bottom: 16, zIndex: 100, width: 40, height: 40, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        whileTap={{ scale: 0.88 }}>
        <motion.div animate={{ rotate: isOpen ? 360 : 0 }} transition={{ duration: 0.65, ease: [0.4,0,0.2,1] }} style={{ position: 'relative', width: 24, height: 24 }}>
          <motion.div style={{ position: 'absolute', inset: 0 }} animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.6 : 1 }} transition={{ duration: 0.28, delay: isOpen ? 0 : 0.3 }}>
            <FullMoon color="var(--color-awan-tx)" />
          </motion.div>
          <motion.div style={{ position: 'absolute', inset: 0 }} animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 1.4 }} transition={{ duration: 0.28, delay: isOpen ? 0.3 : 0 }}>
            <CrescentMoon color="var(--color-awan-gold)" />
          </motion.div>
        </motion.div>
      </motion.button>
    </>
  );
}
