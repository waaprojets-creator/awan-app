import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

function useWindowDimensions() {
  const [dims, setDims] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return dims;
}

// ── Architecture de l'application — arborescence constellation ────────────────

interface Node {
  id: string;
  label: string;
  sub?: string;
  x: number;   // % largeur
  y: number;   // % hauteur (0=haut)
  tier: 0 | 1 | 2;
}

const NODES: Node[] = [
  { id: 'Dashboard',   label: 'TERMINAL',   sub: 'HUB',        x: 50, y: 40, tier: 0 },
  { id: 'Islam',       label: 'SPIRIT',     sub: 'ISLAM',      x: 18, y: 18, tier: 1 },
  { id: 'Sante',       label: 'BODY',       sub: 'SANTÉ',      x: 50, y: 14, tier: 1 },
  { id: 'Planning',    label: 'TIME',       sub: 'PLANNING',   x: 80, y: 20, tier: 1 },
  { id: 'Journal',     label: 'JOURNAL',    sub: 'LOG',        x: 86, y: 46, tier: 1 },
  { id: 'Trajet',      label: 'TRAJET',     sub: 'GPS',        x: 74, y: 64, tier: 1 },
  { id: 'Sport',       label: 'SPORT',      sub: 'BODY.1',     x: 22, y: 42, tier: 2 },
  { id: 'Nutrition',   label: 'NUTRITION',  sub: 'BODY.2',     x: 30, y: 62, tier: 2 },
  { id: 'Mensuration', label: 'SCAN',       sub: 'BODY.3',     x: 14, y: 66, tier: 2 },
  { id: 'Reglages',    label: 'SYSTÈME',    sub: 'SYS',        x: 62, y: 76, tier: 2 },
  { id: 'Tasks',       label: 'TASKS',      sub: 'OPS',        x: 92, y: 30, tier: 2 },
  { id: 'Coach',       label: 'COACH',      sub: 'SYS.1',      x: 62, y: 56, tier: 2 },
];

const EDGES: [string, string][] = [
  ['Dashboard', 'Islam'],
  ['Dashboard', 'Sante'],
  ['Dashboard', 'Planning'],
  ['Dashboard', 'Journal'],
  ['Dashboard', 'Trajet'],
  ['Sante', 'Sport'],
  ['Sante', 'Nutrition'],
  ['Sante', 'Mensuration'],
  ['Journal', 'Reglages'],
  ['Planning', 'Tasks'],
  ['Dashboard', 'Coach'],
];

// ── SVG Lune ──────────────────────────────────────────────────────────────────

function FullMoon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function CrescentMoon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface MoonMenuProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export function MoonMenu({ onNavigate, currentRoute }: MoonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { width: W, height: H } = useWindowDimensions();

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const handleNavigate = useCallback((route: string) => {
    setIsOpen(false);
    setTimeout(() => onNavigate(route), 200);
  }, [onNavigate]);

  // Fermeture sur Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Position du bouton lune en bas à gauche
  const MOON_X = 20;
  const MOON_Y = H - 52;

  return (
    <>
      {/* ── Overlay constellation ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
              // Dégradé radiel partant du coin bas-gauche (position lune)
              background: 'rgba(0,0,0,0.6)',
            }}
            onClick={() => setIsOpen(false)}
          >
            {/* ── SVG constellation ──────────────────────────────────────────── */}
            <svg
              width={W}
              height={H}
              style={{ position: 'absolute', inset: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lignes constellation */}
              {EDGES.map(([fromId, toId], i) => {
                const from = NODES.find((n) => n.id === fromId)!;
                const to   = NODES.find((n) => n.id === toId)!;
                const x1 = (from.x / 100) * W;
                const y1 = (from.y / 100) * (H * 0.88);
                const x2 = (to.x / 100) * W;
                const y2 = (to.y / 100) * (H * 0.88);
                return (
                  <motion.line
                    key={`${fromId}-${toId}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(212,175,55,0.18)"
                    strokeWidth={0.8}
                    strokeDasharray="3 4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                  />
                );
              })}

              {/* Points et labels */}
              {NODES.map((node, i) => {
                const cx = (node.x / 100) * W;
                const cy = (node.y / 100) * (H * 0.88);
                const isActive = currentRoute === node.id;
                const isTier0 = node.tier === 0;
                const r = isTier0 ? 5 : node.tier === 1 ? 3.5 : 2.5;
                const delay = 0.15 + i * 0.05;

                return (
                  <g key={node.id} onClick={() => handleNavigate(node.id)} style={{ cursor: 'pointer' }}>
                    {/* Zone de tap élargie */}
                    <circle cx={cx} cy={cy} r={22} fill="transparent" />

                    {/* Halo pour tier0 et actif */}
                    {(isTier0 || isActive) && (
                      <motion.circle
                        cx={cx} cy={cy}
                        r={r + 6}
                        fill="rgba(212,175,55,0.06)"
                        stroke="rgba(212,175,55,0.15)"
                        strokeWidth={0.5}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay, duration: 0.4 }}
                      />
                    )}

                    {/* Point étoile */}
                    <motion.circle
                      cx={cx} cy={cy} r={r}
                      fill={isActive ? 'var(--color-awan-gold)' : isTier0 ? 'rgba(212,175,55,0.9)' : node.tier === 1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay, duration: 0.3, type: 'spring', stiffness: 300 }}
                    />

                    {/* Label principal */}
                    <motion.text
                      x={cx}
                      y={cy - r - 8}
                      textAnchor="middle"
                      fill={isActive ? 'var(--color-awan-gold)' : isTier0 ? 'rgba(255,255,255,0.9)' : node.tier === 1 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)'}
                      fontSize={isTier0 ? 17 : node.tier === 1 ? 14 : 13}
                      fontFamily="var(--font-sans)"
                      fontWeight={isTier0 ? 700 : 600}
                      letterSpacing="0.15em"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: delay + 0.1, duration: 0.25 }}
                    >
                      {node.label}
                    </motion.text>

                    {/* Sub-label */}
                    <motion.text
                      x={cx}
                      y={cy + r + 14}
                      textAnchor="middle"
                      fill="rgba(212,175,55,0.4)"
                      fontSize={6}
                      fontFamily="var(--font-mono)"
                      letterSpacing="0.2em"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: delay + 0.15, duration: 0.25 }}
                    >
                      {node.sub}
                    </motion.text>
                  </g>
                );
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bouton lune ───────────────────────────────────────────────────────── */}
      <motion.button
        onClick={toggle}
        style={{
          position: 'fixed',
          left: MOON_X,
          bottom: 16,
          zIndex: 100,
          width: 40,
          height: 40,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 360 : 0 }}
          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'relative', width: 24, height: 24 }}
        >
          {/* Pleine lune → disparaît à l'ouverture */}
          <motion.div
            style={{ position: 'absolute', inset: 0 }}
            animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.6 : 1 }}
            transition={{ duration: 0.3, delay: isOpen ? 0 : 0.3 }}
          >
            <FullMoon color="var(--color-awan-tx)" />
          </motion.div>

          {/* Croissant doré → apparaît à l'ouverture */}
          <motion.div
            style={{ position: 'absolute', inset: 0 }}
            animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 1.4 }}
            transition={{ duration: 0.3, delay: isOpen ? 0.3 : 0 }}
          >
            <CrescentMoon color="var(--color-awan-gold)" />
          </motion.div>
        </motion.div>
      </motion.button>
    </>
  );
}
