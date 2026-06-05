import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { View, Dimensions } from 'react-native';
import Svg, { Rect, Line, Path } from 'react-native-svg';
import { Zap } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { Touch } from '../../components/ui/Touch';
import { getStorage } from '../../data/storage/storageService';
import { GuardCard, LoadingState, loadNutritionProfile } from './shared';

const SvgRect_ = Rect as any;
const SvgLine_ = Line as any;
const SvgPath_ = Path as any;

type ViewMode = '31j' | '12s';

interface DayMetabo {
  label: string;
  kcal: number;
  anabPct: number; // fraction 0-1 of target
  catabPct: number; // deficit fraction 0-1
}

interface WeekMetabo {
  label: string;
  avgKcal: number;
  anabPct: number;
  catabPct: number;
}

async function load31Days(targetKcal: number): Promise<DayMetabo[]> {
  const storage = await getStorage();
  return Promise.all(
    Array.from({ length: 31 }, async (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (30 - i));
      const date = d.toISOString().slice(0, 10);
      const kcal = await storage.aggregate('nutrition.meal', 'kcal', 'SUM', { date });
      const anabPct = targetKcal > 0 ? Math.min(1, kcal / targetKcal) : 0;
      const catabPct = targetKcal > 0 ? Math.max(0, (targetKcal - kcal) / targetKcal) : 0;
      return { label: date.slice(5), kcal, anabPct, catabPct };
    }),
  );
}

async function load12Weeks(targetKcal: number): Promise<WeekMetabo[]> {
  const storage = await getStorage();
  const results: WeekMetabo[] = [];
  for (let w = -11; w <= 0; w++) {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1) + w * 7);
    const dates = Array.from({ length: 7 }, (_, d) => {
      const dd = new Date(monday); dd.setDate(monday.getDate() + d);
      return dd.toISOString().slice(0, 10);
    });
    const kcals = await Promise.all(dates.map(date => storage.aggregate('nutrition.meal', 'kcal', 'SUM', { date })));
    const logged = kcals.filter(k => k > 0);
    const avgKcal = logged.length > 0 ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;
    const anabPct = targetKcal > 0 ? Math.min(1, avgKcal / targetKcal) : 0;
    const catabPct = targetKcal > 0 ? Math.max(0, (targetKcal - avgKcal) / targetKcal) : 0;
    results.push({ label: w === 0 ? 'S0' : `S${w}`, avgKcal, anabPct, catabPct });
  }
  return results;
}

export function MetaboliqueTab() {
  const theme = useTheme();
  const [mode, setMode] = useState<ViewMode>('31j');
  const [data31, setData31] = useState<DayMetabo[] | null>(null);
  const [data12, setData12] = useState<WeekMetabo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const profile = useMemo(() => loadNutritionProfile(), []);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    Promise.all([load31Days(profile.targetKcal), load12Weeks(profile.targetKcal)])
      .then(([d31, d12]) => { if (active) { setData31(d31); setData12(d12); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile?.targetKcal]);

  if (!profile) {
    return (
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Balance anabolisme / catabolisme">MÉTABOLISME</Heading>
        <GuardCard message="Profil nutritionnel manquant → Nutrition → Objectifs" />
      </Card>
    );
  }

  if (loading) return <LoadingState label="Calcul métabolique..." />;

  const barData31 = (data31 ?? []).map(d => ({ label: d.label, anabPct: d.anabPct, catabPct: d.catabPct, kcal: d.kcal }));
  const barData12 = (data12 ?? []).map(d => ({ label: d.label, anabPct: d.anabPct, catabPct: d.catabPct, kcal: d.avgKcal }));
  const barData = mode === '31j' ? barData31 : barData12;

  return (
    <div className="space-y-8">
      {/* Toggle 31j / 12s */}
      <div className="flex flex-row gap-3">
        {(['31j', '12s'] as ViewMode[]).map(m => (
          <Touch
            key={m}
            className={`px-5 py-1.5 border transition-all ${mode === m ? 'bg-awan-gold/20 border-awan-gold' : 'border-white/10'}`}
            onPress={() => setMode(m)}
          >
            <span className={`text-awan-md font-black tracking-[0.2em] ${mode === m ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
              {m.toUpperCase()}
            </span>
          </Touch>
        ))}
      </div>

      {/* Barres anabolisme/catabolisme */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle={`Balance métabolique · ${mode === '31j' ? '31 derniers jours' : '12 semaines'}`}>
          ANABOLISME / CATABOLISME
        </Heading>
        <MetaboliqueChart data={barData} targetKcal={profile.targetKcal} />
        <div className="flex flex-row gap-4 mt-3">
          <div className="flex flex-row items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.statusOk }} />
            <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">Anabolisme</span>
          </div>
          <div className="flex flex-row items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.danger }} />
            <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">Déficit</span>
          </div>
        </div>
      </Card>

      {/* Balance protéique circadienne — guard propre */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Modèle cinétique mTOR">BALANCE PROTÉIQUE CIRCADIENNE</Heading>
        <GuardCard message="Disponible avec la saisie des horaires de repas (AWAN v5)" />
      </Card>
    </div>
  );
}

interface BarDatum { label: string; anabPct: number; catabPct: number; kcal: number }

function MetaboliqueChart({ data, targetKcal }: { data: BarDatum[]; targetKcal: number }) {
  const theme = useTheme();
  const W = Dimensions.get('window').width - 88;
  const H = 180;
  const pad = { t: 10, b: 20 };
  const chartH = H - pad.t - pad.b;
  const colW = W / Math.max(data.length, 1);
  const barW = Math.max(3, colW * 0.7);

  // Bilan net cumulé (anabolisme - catabolisme, normalisé)
  let cumul = 0;
  const cumulPoints = data.map((d, i) => {
    const net = d.anabPct - d.catabPct;
    cumul += net;
    const x = i * colW + colW / 2;
    const maxCumul = data.length; // max si 100% chaque jour
    const y = pad.t + chartH / 2 - (cumul / maxCumul) * (chartH / 2);
    return `${x},${Math.max(pad.t, Math.min(H - pad.b, y))}`;
  });

  return (
    <View style={{ marginTop: 16 }}>
      <Svg width={W} height={H}>
        {/* Ligne de référence (cible = 100%) */}
        <SvgLine_
          x1={0} y1={pad.t + chartH * (1 - 1)} // y=0 quand anabPct=1
          x2={W} y2={pad.t}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1"
        />

        {data.map((d, i) => {
          const x = i * colW + (colW - barW) / 2;
          const anabH = d.anabPct * chartH;
          const catabH = d.catabPct * chartH;

          return (
            <React.Fragment key={i}>
              {/* Anabolisme (vert, haut) */}
              {anabH > 0 && (
                <SvgRect_
                  x={x} y={pad.t + chartH - anabH}
                  width={barW} height={anabH}
                  fill={theme.statusOk} opacity={0.7}
                />
              )}
              {/* Déficit (rouge, overlay) */}
              {catabH > 0 && (
                <SvgRect_
                  x={x} y={pad.t + chartH - catabH}
                  width={barW} height={catabH}
                  fill={theme.danger} opacity={0.5}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Courbe bilan net */}
        {cumulPoints.length > 1 && (
          <SvgPath_
            d={`M ${cumulPoints.join(' L ')}`}
            fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"
          />
        )}
      </Svg>
    </View>
  );
}
