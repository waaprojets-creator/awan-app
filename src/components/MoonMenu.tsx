import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { L } from '../constants/labels';
import { safeStorage } from '../utils/safeStorage';

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

// Orbital layout — portrait-optimised, centre (50%, 52%), deux anneaux concentriques.
// Ring 1 r=22% CH, Ring 2 r=36% CH. Bearings clockwise depuis 12h.
// Aucune arête ne se croise : tous les nœuds tier-1 sont à 72° d'écart autour du centre ;
// les clusters tier-2 se déploient en éventail depuis leur parent sans recoupement.
const NODES: Node[] = [
  { id: 'Dashboard',   label: n('hub'),        x: 50.0, y: 52.0, tier: 0 },
  // — Ring 1 (tier 1) — r=22% CH, bearings 0/72/144/216/288°
  { id: 'Islam',       label: n('spirit'),     x: 50.0, y: 30.0, tier: 1 },  // bearing   0°
  { id: 'Trajet',      label: n('trajet'),     x: 70.9, y: 45.2, tier: 1 },  // bearing  72°
  { id: 'Planning',    label: n('planning'),   x: 62.9, y: 69.8, tier: 1 },  // bearing 144°
  { id: 'Journal',     label: n('journal'),    x: 37.1, y: 69.8, tier: 1 },  // bearing 216°
  { id: 'Sante',       label: n('sante'),      x: 29.1, y: 45.2, tier: 1 },  // bearing 288°
  // — Ring 2 (tier 2) — r=36% CH, Sante cluster bearings 255–309°
  { id: 'Sport',       label: n('sport'),      x: 15.2, y: 61.3, tier: 2 },  // bearing 255°
  { id: 'Nutrition',   label: n('nutrition'),  x: 14.0, y: 50.1, tier: 2 },  // bearing 273°
  { id: 'Mensuration', label: n('mensuration'),x: 16.4, y: 39.1, tier: 2 },  // bearing 291°
  { id: 'Sleep',       label: 'SOMMEIL',       x: 22.0, y: 29.4, tier: 2 },  // bearing 309°
  // — Ring 2 — Dashboard direct children
  { id: 'Coach',       label: n('coach'),      x: 70.6, y: 22.5, tier: 2 },  // bearing  35°
  { id: 'Reglages',    label: n('reglages'),   x: 85.9, y: 55.1, tier: 2 },  // bearing  95°
  // — Ring 2 — Planning cluster
  { id: 'Tasks',       label: n('tasks'),      x: 71.2, y: 81.1, tier: 2 },  // bearing 144°
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
  ['Sante', 'Sleep'],
  ['Planning', 'Tasks'],
];

// Tier lookup for edge stroke scaling
const TIER_MAP: Record<string, number> = Object.fromEntries(NODES.map(n => [n.id, n.tier]));

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

function CrescentMoon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M17.5 12 C17.5 16.14 14.14 19.5 10 19.5 C7.24 19.5 4.84 18.02 3.5 15.8
           C4.32 16.06 5.2 16.2 6.1 16.2 C10.24 16.2 13.6 12.84 13.6 8.7
           C13.6 6.9 12.96 5.24 11.9 3.96 C15.12 4.86 17.5 8.16 17.5 12 Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  );
}

type NodePositions = Record<string, { x: number; y: number }>;

function loadLayout(): NodePositions {
  try { return JSON.parse(safeStorage.get('awan.moonmenu.layout') || '{}'); }
  catch { return {}; }
}

const MARGIN = 14;

interface MoonMenuProps { onNavigate: (route: string) => void; currentRoute: string; }

export function MoonMenu({ onNavigate, currentRoute }: MoonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nodePositions, setNodePositions] = useState<NodePositions>(loadLayout);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null);
  const { width: W, height: H } = useWindowDimensions();
  // Listen for the event dispatched by SettingsScreen → auto-open in editMode
  useEffect(() => {
    const handler = () => {
      setIsOpen(true);
      setEditMode(true);
    };
    window.addEventListener('moonmenu:open-edit', handler);
    return () => window.removeEventListener('moonmenu:open-edit', handler);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (!v) {
        if (safeStorage.get('awan.moonmenu.pending-edit') === '1') {
          safeStorage.set('awan.moonmenu.pending-edit', '0');
          setEditMode(true);
        }
      }
      return !v;
    });
  }, []);
  const handleNavigate = useCallback((route: string) => {
    if (editMode) return;
    setIsOpen(false);
    setTimeout(() => onNavigate(route), 200);
  }, [onNavigate, editMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsOpen(false); setEditMode(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const CH = H * 0.86;

  // Orbital ring radii — matched to the new portrait layout (centre y=52% CH)
  const orbitCX = W * 0.5;
  const orbitCY = CH * 0.52;
  const ring1R  = CH * 0.22;
  const ring2R  = CH * 0.36;

  const resolvedNodes = NODES.map(node => ({
    ...node,
    x: nodePositions[node.id]?.x ?? node.x,
    y: nodePositions[node.id]?.y ?? node.y,
  }));

  // Push label away from the orbital centre so it never crosses an edge.
  // Direction vector (node → away from centre) drives anchor + offset.
  function labelPos(node: Node & { x: number; y: number }) {
    const cx   = (node.x / 100) * W;
    const cy   = (node.y / 100) * CH;
    const r    = node.tier === 0 ? 5 : node.tier === 1 ? 3.5 : 2.5;
    const gap  = r + 8;
    // Vector from orbital centre to node
    const dx = node.x - 50;   // in %
    const dy = node.y - 52;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    if (node.tier === 0) {
      // Dashboard centre — label above
      return { textX: cx, textY: cy - r - 12, anchor: 'middle' as const };
    }
    if (adx < 8) {
      // Nearly vertical — above or below
      return dy < 0
        ? { textX: cx, textY: Math.max(MARGIN + 8, cy - gap), anchor: 'middle' as const }
        : { textX: cx, textY: Math.min(CH - MARGIN, cy + gap + 4), anchor: 'middle' as const };
    }
    if (dx > 0) {
      // Right side — label to the right
      return { textX: Math.min(W - MARGIN, cx + gap), textY: cy + 3, anchor: 'start' as const };
    }
    // Left side — label to the left
    return { textX: Math.max(MARGIN, cx - gap), textY: cy + 3, anchor: 'end' as const };
  }

  function onDragStart(nodeId: string, mx: number, my: number) {
    if (!editMode) return;
    const node = resolvedNodes.find(n => n.id === nodeId)!;
    dragStart.current = { mx, my, nx: node.x, ny: node.y };
    setDraggingId(nodeId);
  }

  function onDragMove(mx: number, my: number) {
    if (!draggingId || !dragStart.current) return;
    const dx = ((mx - dragStart.current.mx) / W) * 100;
    const dy = ((my - dragStart.current.my) / CH) * 100;
    setNodePositions(prev => ({
      ...prev,
      [draggingId]: {
        x: Math.max(4, Math.min(96, dragStart.current!.nx + dx)),
        y: Math.max(4, Math.min(96, dragStart.current!.ny + dy)),
      }
    }));
  }

  function onDragEnd() {
    setDraggingId(null);
    dragStart.current = null;
  }

  function saveLayout() {
    safeStorage.set('awan.moonmenu.layout', JSON.stringify(nodePositions));
    setEditMode(false);
  }

  function cancelEdit() {
    setNodePositions(loadLayout());
    setEditMode(false);
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: editMode ? 'var(--color-awan-overlay-deep)' : 'rgba(0,0,0,0.88)' }}
            onClick={() => { if (editMode) cancelEdit(); else setIsOpen(false); }}
            onMouseMove={e => onDragMove(e.clientX, e.clientY)}
            onMouseUp={onDragEnd}
            onTouchMove={e => { const t = e.touches[0]; if (t) onDragMove(t.clientX, t.clientY); }}
            onTouchEnd={onDragEnd}
          >
            {editMode && (
              <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 12 }}>
                <button
                  onClick={saveLayout}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', padding: '8px 20px', background: 'var(--color-awan-gold)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  SAUVEGARDER
                </button>
                <button
                  onClick={cancelEdit}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', padding: '8px 20px', background: 'transparent', color: 'var(--color-awan-tx-dim)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
                >
                  ANNULER
                </button>
              </div>
            )}
            {editMode && (
              <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.25em', color: 'var(--color-awan-tx-dim)', textTransform: 'uppercase' }}>
                  GLISSER LES NŒUDS POUR REPOSITIONNER
                </span>
              </div>
            )}
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} onClick={(e) => e.stopPropagation()}>

              {/* Orbital rings — structural guides, hidden in edit mode */}
              {!editMode && (
                <>
                  <motion.circle
                    cx={orbitCX} cy={orbitCY} r={ring1R}
                    stroke="rgba(212,175,55,0.09)" strokeWidth={0.7} strokeDasharray="3 11"
                    fill="none"
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  />
                  <motion.circle
                    cx={orbitCX} cy={orbitCY} r={ring2R}
                    stroke="rgba(212,175,55,0.055)" strokeWidth={0.5} strokeDasharray="2 16"
                    fill="none"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.65, delay: 0.06, ease: 'easeOut' }}
                  />
                </>
              )}

              {/* Molecular bonds (edges) */}
              {EDGES.map(([fromId, toId], i) => {
                const from = resolvedNodes.find((nd) => nd.id === fromId)!;
                const to   = resolvedNodes.find((nd) => nd.id === toId)!;
                // Primary bonds (tier 0→1) are thicker than secondary bonds (tier 1→2)
                const isPrimary = TIER_MAP[fromId] === 0 && TIER_MAP[toId] === 1;
                return (
                  <motion.line key={`${fromId}-${toId}`}
                    x1={(from.x/100)*W} y1={(from.y/100)*CH} x2={(to.x/100)*W} y2={(to.y/100)*CH}
                    stroke={editMode ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.22)'}
                    strokeWidth={isPrimary ? 1.8 : 1.2}
                    strokeDasharray={isPrimary ? '4 5' : '2 6'}
                    initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: editMode ? 0 : 0.05 + i * 0.024, ease: 'easeOut' }}
                  />
                );
              })}

              {/* Nodes */}
              {resolvedNodes.map((node, i) => {
                const cx = (node.x/100)*W, cy = (node.y/100)*CH;
                const isActive = currentRoute === node.id;
                const isDragging = draggingId === node.id;
                const isTier0  = node.tier === 0;
                const r = isTier0 ? 5 : node.tier === 1 ? 3.5 : 2.5;
                const delay = editMode ? 0 : 0.12 + i * 0.04;
                const { textX, textY, anchor } = labelPos(node);
                const lColor = isActive ? 'var(--color-awan-gold)' : isTier0 ? 'rgba(255,255,255,0.92)' : node.tier === 1 ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.42)';
                const fSize = isTier0 ? 15 : node.tier === 1 ? 12 : 11;
                const fWeight = isTier0 ? 800 : node.tier === 1 ? 700 : 600;
                return (
                  <g key={node.id}
                    onClick={() => handleNavigate(node.id)}
                    onMouseDown={e => { e.stopPropagation(); onDragStart(node.id, e.clientX, e.clientY); }}
                    onTouchStart={e => { e.stopPropagation(); const t = e.touches[0]; if (t) onDragStart(node.id, t.clientX, t.clientY); }}
                    style={{ cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
                  >
                    <circle cx={cx} cy={cy} r={editMode ? 28 : 24} fill="transparent" />
                    {editMode && (
                      <circle cx={cx} cy={cy} r={r + 10} fill="rgba(212,175,55,0.08)" stroke="rgba(212,175,55,0.25)" strokeWidth={0.8} strokeDasharray="4 3" />
                    )}
                    {!editMode && (isTier0 || isActive) && (
                      <motion.circle cx={cx} cy={cy} r={r+7} fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.18)" strokeWidth={0.6}
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay, duration: 0.4 }} />
                    )}
                    <motion.circle cx={cx} cy={cy} r={r}
                      fill={isDragging ? 'var(--color-awan-gold)' : isActive ? 'var(--color-awan-gold)' : isTier0 ? 'rgba(212,175,55,0.9)' : node.tier===1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: isDragging ? 1.4 : 1, opacity: 1 }}
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
        <motion.div animate={{ rotate: isOpen ? 360 : 0 }} transition={{ duration: 0.65, ease: [0.4,0,0.2,1] }} style={{ width: 24, height: 24 }}>
          {isOpen
            ? <CrescentMoon color="var(--color-awan-gold)" />
            : <FullMoon color="var(--color-awan-tx)" />}
        </motion.div>
      </motion.button>
    </>
  );
}
