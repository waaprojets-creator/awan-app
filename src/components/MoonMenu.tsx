import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, Platform, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText, Path } from 'react-native-svg';
import { L } from '../constants/labels';
import { safeStorage } from '../utils/safeStorage';
import { moonMenuEvents } from '../utils/moonMenuEvents';
import { useTheme } from '../hooks/useTheme';
import { FontSans } from '../constants/typography';
import { Fw, Ls } from '../theme/tokens';

const nav = (L as any).nav as Record<string, string | undefined>;
const n = (k: string): string => nav[k] ?? k;

interface Node { id: string; label: string; x: number; y: number; tier: 0 | 1 | 2; }

const NODES: Node[] = [
  { id: 'Dashboard',   label: n('hub'),         x: 50.0, y: 52.0, tier: 0 },
  { id: 'Islam',       label: n('spirit'),       x: 50.0, y: 30.0, tier: 1 },
  { id: 'Reglages',   label: n('reglages'),     x: 69.1, y: 41.0, tier: 1 },
  { id: 'Planning',    label: n('planning'),     x: 69.1, y: 63.0, tier: 1 },
  { id: 'Sante',       label: n('sante'),        x: 50.0, y: 74.0, tier: 1 },
  { id: 'Trajet',      label: n('trajet'),       x: 30.9, y: 63.0, tier: 1 },
  { id: 'Analyse',     label: n('analyse'),      x: 30.9, y: 41.0, tier: 1 },
  { id: 'Journal',     label: n('journal'),      x: 73.5, y: 75.0, tier: 2 },
  { id: 'Tasks',       label: n('tasks'),        x: 79.0, y: 59.5, tier: 2 },
  { id: 'Sleep',       label: 'SOMMEIL',         x: 59.5, y: 83.5, tier: 2 },
  { id: 'Mensuration', label: n('mensuration'),  x: 53.5, y: 85.5, tier: 2 },
  { id: 'Nutrition',   label: n('nutrition'),    x: 46.5, y: 85.5, tier: 2 },
  { id: 'Sport',       label: n('sport'),        x: 40.5, y: 83.5, tier: 2 },
  { id: 'Coach',       label: n('coach'),        x: 22.0, y: 34.5, tier: 2 },
];

const EDGES: [string, string][] = [
  ['Dashboard', 'Islam'], ['Dashboard', 'Reglages'], ['Dashboard', 'Planning'],
  ['Dashboard', 'Sante'], ['Dashboard', 'Trajet'], ['Dashboard', 'Analyse'],
  ['Planning', 'Journal'], ['Planning', 'Tasks'],
  ['Sante', 'Sleep'], ['Sante', 'Mensuration'], ['Sante', 'Nutrition'], ['Sante', 'Sport'],
  ['Analyse', 'Coach'],
];

const TIER_MAP: Record<string, number> = Object.fromEntries(NODES.map(nd => [nd.id, nd.tier]));

function FullMoon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="9"  cy="9"  r="1.8" stroke={color} strokeWidth="0.7" fill="none" opacity={0.35} />
      <Circle cx="15" cy="7"  r="1.1" stroke={color} strokeWidth="0.6" fill="none" opacity={0.28} />
      <Circle cx="15" cy="14" r="1.4" stroke={color} strokeWidth="0.6" fill="none" opacity={0.30} />
      <Circle cx="8"  cy="15" r="0.7" stroke={color} strokeWidth="0.5" fill="none" opacity={0.25} />
    </Svg>
  );
}

function CrescentMoon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M17.5 12 C17.5 16.14 14.14 19.5 10 19.5 C7.24 19.5 4.84 18.02 3.5 15.8 C4.32 16.06 5.2 16.2 6.1 16.2 C10.24 16.2 13.6 12.84 13.6 8.7 C13.6 6.9 12.96 5.24 11.9 3.96 C15.12 4.86 17.5 8.16 17.5 12 Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"
      />
    </Svg>
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
  const theme = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nodePositions, setNodePositions] = useState<NodePositions>(loadLayout);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null);

  useEffect(() => {
    return moonMenuEvents.onOpenEdit(() => {
      setIsOpen(true);
      setEditMode(true);
    });
  }, []);

  // Pending edit flag on open
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (!v && safeStorage.get('awan.moonmenu.pending-edit') === '1') {
        safeStorage.set('awan.moonmenu.pending-edit', '0');
        setEditMode(true);
      }
      return !v;
    });
  }, []);

  const handleNavigate = useCallback((route: string) => {
    if (editMode) return;
    setIsOpen(false);
    setTimeout(() => onNavigate(route), 200);
  }, [onNavigate, editMode]);

  const CH = H * 0.86;
  const orbitCX = W * 0.5;
  const orbitCY = CH * 0.52;
  const ring1R  = CH * 0.22;
  const ring2R  = CH * 0.33;

  const resolvedNodes = NODES.map(node => ({
    ...node,
    x: nodePositions[node.id]?.x ?? node.x,
    y: nodePositions[node.id]?.y ?? node.y,
  }));

  function labelPos(node: Node & { x: number; y: number }) {
    const cx = (node.x / 100) * W;
    const cy = (node.y / 100) * CH;
    const r   = node.tier === 0 ? 5 : node.tier === 1 ? 3.5 : 2.5;
    const gap = r + 8;
    const dx = node.x - 50;
    const dy = node.y - 52;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (node.tier === 0) return { textX: cx, textY: cy - r - 12, anchor: 'middle' as const };
    if (adx < 8) {
      return dy < 0
        ? { textX: cx, textY: Math.max(MARGIN + 8, cy - gap), anchor: 'middle' as const }
        : { textX: cx, textY: Math.min(CH - MARGIN, cy + gap + 4), anchor: 'middle' as const };
    }
    if (dx > 0) return { textX: Math.min(W - MARGIN, cx + gap), textY: cy + 3, anchor: 'start' as const };
    return { textX: Math.max(MARGIN, cx - gap), textY: cy + 3, anchor: 'end' as const };
  }

  // Drag — web only (mouse/touch events not available on RN SVG elements)
  function onDragStart(nodeId: string, mx: number, my: number) {
    if (!editMode || Platform.OS !== 'web') return;
    const node = resolvedNodes.find(nd => nd.id === nodeId)!;
    dragStart.current = { mx, my, nx: node.x, ny: node.y };
    setDraggingId(nodeId);
  }
  function onDragMove(mx: number, my: number) {
    if (!draggingId || !dragStart.current) return;
    // Capture en local — dragStart.current peut devenir null avant l'exécution
    // de l'updater ci-dessous (onDragEnd peut s'intercaler entre deux events tactiles).
    const { mx: startMx, my: startMy, nx: startNx, ny: startNy } = dragStart.current;
    const dx = ((mx - startMx) / W) * 100;
    const dy = ((my - startMy) / CH) * 100;
    setNodePositions(prev => ({
      ...prev,
      [draggingId]: {
        x: Math.max(4, Math.min(96, startNx + dx)),
        y: Math.max(4, Math.min(96, startNy + dy)),
      },
    }));
  }
  function onDragEnd() { setDraggingId(null); dragStart.current = null; }

  function saveLayout() {
    safeStorage.set('awan.moonmenu.layout', JSON.stringify(nodePositions));
    setEditMode(false);
  }
  function cancelEdit() {
    setNodePositions(loadLayout());
    setEditMode(false);
  }

  const webDragHandlers = Platform.OS === 'web' ? {
    onMouseMove: (e: any) => onDragMove(e.clientX, e.clientY),
    onMouseUp: onDragEnd,
    onTouchMove: (e: any) => { const t = e.touches?.[0]; if (t) onDragMove(t.clientX, t.clientY); },
    onTouchEnd: onDragEnd,
  } : {};

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => { if (editMode) cancelEdit(); else setIsOpen(false); }}
      >
        <View
          style={[s.overlay, { backgroundColor: editMode ? theme.overlayDeep : 'rgba(0,0,0,0.88)' }]}
          {...webDragHandlers}
        >
          {editMode && (
            <View style={s.editHeader}>
              <Pressable
                onPress={saveLayout}
                style={[s.editBtn, { backgroundColor: theme.selected }]}
              >
                <Text style={[s.editBtnText, { color: '#000' }]}>SAUVEGARDER</Text>
              </Pressable>
              <Pressable
                onPress={cancelEdit}
                style={[s.editBtn, s.editBtnOutline, { borderColor: 'rgba(255,255,255,0.15)' }]}
              >
                <Text style={[s.editBtnText, { color: theme.text }]}>ANNULER</Text>
              </Pressable>
            </View>
          )}
          {editMode && (
            <View style={s.editHint}>
              <Text style={[s.editHintText, { color: theme.text }]}>
                GLISSER LES NŒUDS POUR REPOSITIONNER
              </Text>
            </View>
          )}

          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { if (editMode) cancelEdit(); else setIsOpen(false); }}
          />

          <Svg
            width={W}
            height={H}
            style={StyleSheet.absoluteFillObject as any}
            onPress={(e: any) => e.stopPropagation?.()}
          >
            {/* Anneaux orbitaux */}
            {!editMode && (
              <>
                <Circle cx={orbitCX} cy={orbitCY} r={ring1R}
                  stroke="rgba(212,175,55,0.09)" strokeWidth={0.7} strokeDasharray="3 11" fill="none" />
                <Circle cx={orbitCX} cy={orbitCY} r={ring2R}
                  stroke="rgba(212,175,55,0.055)" strokeWidth={0.5} strokeDasharray="2 16" fill="none" />
              </>
            )}

            {/* Arêtes */}
            {EDGES.map(([fromId, toId]) => {
              const from = resolvedNodes.find(nd => nd.id === fromId)!;
              const to   = resolvedNodes.find(nd => nd.id === toId)!;
              const isPrimary = TIER_MAP[fromId] === 0 && TIER_MAP[toId] === 1;
              return (
                <Line key={`${fromId}-${toId}`}
                  x1={(from.x/100)*W} y1={(from.y/100)*CH}
                  x2={(to.x/100)*W}   y2={(to.y/100)*CH}
                  stroke={editMode ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.22)'}
                  strokeWidth={isPrimary ? 1.8 : 1.2}
                  strokeDasharray={isPrimary ? '4 5' : '2 6'}
                />
              );
            })}

            {/* Nœuds */}
            {resolvedNodes.map((node, i) => {
              const cx = (node.x/100)*W;
              const cy = (node.y/100)*CH;
              const isActive  = currentRoute === node.id;
              const isDragging = draggingId === node.id;
              const isTier0   = node.tier === 0;
              const r = isTier0 ? 5 : node.tier === 1 ? 3.5 : 2.5;
              const { textX, textY, anchor } = labelPos(node);
              const lColor = isActive ? theme.selected : node.tier <= 1 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.42)';
              const fSize  = isTier0 ? 15 : node.tier === 1 ? 13 : 11;
              const fWeight = node.tier <= 1 ? '800' : '600';

              return (
                <G key={node.id}
                  onPress={() => handleNavigate(node.id)}
                  {...(Platform.OS === 'web' ? {
                    onMouseDown: (e: any) => { e.stopPropagation?.(); onDragStart(node.id, e.clientX, e.clientY); },
                    onTouchStart: (e: any) => { e.stopPropagation?.(); const t = e.touches?.[0]; if (t) onDragStart(node.id, t.clientX, t.clientY); },
                  } : {})}
                >
                  <Circle cx={cx} cy={cy} r={editMode ? 28 : 24} fill="transparent" />
                  {editMode && (
                    <Circle cx={cx} cy={cy} r={r + 10}
                      fill="rgba(212,175,55,0.08)" stroke="rgba(212,175,55,0.25)"
                      strokeWidth={0.8} strokeDasharray="4 3" />
                  )}
                  {!editMode && (isTier0 || isActive) && (
                    <Circle cx={cx} cy={cy} r={r+7}
                      fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.18)" strokeWidth={0.6} />
                  )}
                  <Circle cx={cx} cy={cy} r={isDragging ? r * 1.4 : r}
                    fill={isDragging ? theme.selected : isActive ? theme.selected
                      : isTier0 ? 'rgba(212,175,55,0.9)'
                      : node.tier === 1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                  />
                  <SvgText
                    x={textX} y={textY}
                    textAnchor={anchor}
                    fill={lColor}
                    fontSize={fSize}
                    fontFamily={FontSans}
                    fontWeight={fWeight}
                    letterSpacing="0.12"
                  >
                    {node.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      </Modal>

      {/* Bouton trigger — absolu dans le wrapper MainLayout */}
      <Pressable
        onPress={toggle}
        style={s.trigger}
        accessibilityLabel="Menu de navigation"
      >
        <View style={s.triggerInner}>
          {isOpen ? <CrescentMoon color={theme.selected} /> : <FullMoon color={theme.title} />}
        </View>
      </Pressable>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  editHeader: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  editBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editBtnOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  editBtnText: {
    fontFamily: FontSans,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: Fw.value,
  },
  editHint: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  editHintText: {
    fontFamily: FontSans,
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  trigger: {
    position: 'absolute',
    left: 20,
    bottom: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerInner: { width: 24, height: 24 },
});
