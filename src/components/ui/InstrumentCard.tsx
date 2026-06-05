import React from 'react';
import { motion } from '@/components/motion';
import { Touch } from './Touch';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';

export type StatusVariant = 'ok' | 'warn' | 'error' | 'spirit' | 'mute';

interface InstrumentCardProps {
 label: string;
 value: string | number;
 unit?: string;
 status?: StatusVariant;
 progress?: number; // 0–100, affiche barre de progression
 delta?: string; // ex: "+2.3" affiché en annotation
 index?: number; // numéro de cotation [01]
 onPress?: () => void;
 className?: string;
}

function getStatusColor(t: Pick<AwanTheme, 'statusOk' | 'statusWarn' | 'danger' | 'statusSpirit' | 'mute'>): Record<StatusVariant, string> {
  return { ok: t.statusOk, warn: t.statusWarn, error: t.danger, spirit: t.statusSpirit, mute: t.mute };
}

export function InstrumentCard({
 label,
 value,
 unit,
 status = 'mute',
 progress,
 delta,
 index,
 onPress,
 className = '',
}: InstrumentCardProps) {
 const theme = useTheme();
 const STATUS_COLOR = getStatusColor(theme);
 const statusColor = STATUS_COLOR[status];

 const inner = (
 <div
 className={`relative flex flex-col justify-between p-4 border overflow-hidden ${className}`}
 style={{
 backgroundColor: theme.surface,
 borderColor: theme.border,
 minHeight: 96,
 }}
 >
 {/* Cotation technique [01] */}
 {index !== undefined && (
 <span
 className="absolute top-2 right-2"
 style={{
 fontFamily: FontMono,
 fontSize: '7px',
 fontWeight: 400,
 color: theme.mute,
 opacity: 0.5,
 letterSpacing: '0.1em',
 }}
 >
 [{String(index).padStart(2, '0')}]
 </span>
 )}

 {/* Label — Cairo 300 */}
 <span
 className="uppercase tracking-[0.2em] block"
 style={{
 fontFamily: FontSans,
 fontSize: '8px',
 fontWeight: 300,
 color: theme.mute,
 }}
 >
 {label}
 </span>

 {/* Valeur + unité — JetBrains Mono pour les chiffres */}
 <div className="flex items-baseline gap-1 mt-1">
 <span
 style={{
 fontFamily: FontMono,
 fontSize: '22px',
 fontWeight: 700,
 color: statusColor,
 lineHeight: 1,
 letterSpacing: '-0.02em',
 }}
 >
 {value}
 </span>
 {unit && (
 <span
 style={{
 fontFamily: FontMono,
 fontSize: '9px',
 fontWeight: 400,
 color: theme.mute,
 }}
 >
 {unit}
 </span>
 )}
 </div>

 {/* Delta annotation — Cairo 300 */}
 {delta && (
 <span
 className="mt-0.5 block"
 style={{
 fontFamily: FontSans,
 fontSize: '9px',
 fontWeight: 300,
 color: delta.startsWith('+') ? theme.statusOk : theme.danger,
 }}
 >
 {delta}
 </span>
 )}

 {/* Barre de progression — indicateur bas */}
 {progress !== undefined && (
 <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
 <motion.div
 className="h-full"
 style={{ backgroundColor: statusColor }}
 initial={{ width: 0 }}
 animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
 transition={{ duration: 0.6, ease: 'easeOut' }}
 />
 </div>
 )}
 </div>
 );

 if (onPress) {
 return (
 <Touch onPress={onPress} className="block w-full text-left">
 <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
 {inner}
 </motion.div>
 </Touch>
 );
 }

 return inner;
}
