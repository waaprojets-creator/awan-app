import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { motion } from 'motion/react';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { DailyCanvas } from '../components/DailyCanvas';
import { ds } from '../utils/storage';

type Tab = 'protocol' | 'archive';

const PROTOCOLS = [
  { label: 'SÉANCE FOCUS',  sub: '15 MIN',       index: 4 },
  { label: 'RESPIRATION',   sub: 'COHÉRENCE',     index: 5 },
  { label: 'JOURNALING',    sub: 'DUMP COGNITIF', index: 6 },
] as const;

export default function MentalScreen() {
  const [tab, setTab] = useState<Tab>('protocol');
  const today = ds(new Date());

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="MIND" title="MENTAL" statusText="● V3" />

      {/* ── Cadrans 3×1 — données indisponibles ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <InstrumentCard label="FOCUS"    value="—" status="mute" index={1} />
        <InstrumentCard label="CALME"    value="—" status="mute" index={2} />
        <InstrumentCard label="COGNIT."  value="—" status="mute" index={3} />
      </div>

      {/* ── Indicateur v3 ──────────────────────────────────────────────────────── */}
      <div
        className="p-4 border mb-4 flex flex-row items-center justify-between"
        style={{
          backgroundColor: 'var(--color-awan-surface)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 'var(--fw-body)' as any,
            color: 'var(--color-awan-tx-dim)',
          }}
        >
          Données mentales disponibles en v3
        </span>
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--color-awan-tx-mute)' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </div>

      {/* ── Sélecteur d'onglet ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-row p-1 mb-4"
        style={{
          backgroundColor: 'var(--color-awan-surface)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {(['protocol', 'archive'] as Tab[]).map((t) => (
          <Touch
            key={t}
            className="flex-1 py-2 flex items-center justify-center"
            style={{ backgroundColor: tab === t ? 'rgba(212,175,55,0.08)' : 'transparent' }}
            onPress={() => setTab(t)}
          >
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '7px',
                fontWeight: tab === t ? ('var(--fw-value)' as any) : ('var(--fw-label)' as any),
                color: tab === t ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              {t === 'protocol' ? 'PROTOCOLE' : 'ARCHIVE'}
            </span>
          </Touch>
        ))}
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────────── */}
      {tab === 'protocol' ? (
        <div className="flex flex-col gap-3">
          {PROTOCOLS.map((p) => (
            <InstrumentCard
              key={p.label}
              label={p.label}
              value={p.sub}
              status="mute"
              index={p.index}
            />
          ))}
        </div>
      ) : (
        <DailyCanvas dateId={today} filterModule="mental" />
      )}
    </ScrollView>
  );
}
