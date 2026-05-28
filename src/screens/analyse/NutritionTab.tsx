import React from 'react';
import { Flame, Activity } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { BarChart, EmptyState, LoadingState } from './shared';

interface DayMeal { label: string; kcal: number; p: number }

interface NutritionTabProps {
  mealsByDay: DayMeal[];
  mealsLoading: boolean;
  todayKcal: number;
  todayP: number;
  todayC: number;
  todayF: number;
}

export function NutritionTab({
  mealsByDay,
  mealsLoading,
  todayKcal,
  todayP,
  todayC,
  todayF,
}: NutritionTabProps) {
  const theme = useTheme();

  const { avgKcal, avgP, count } = React.useMemo(() => {
    let aK = 0; let aP = 0; let cnt = 0;
    mealsByDay.forEach(d => { if (d.kcal > 0) { aK += d.kcal; aP += d.p; cnt++; } });
    return { avgKcal: cnt > 0 ? Math.round(aK / cnt) : 0, avgP: cnt > 0 ? Math.round(aP / cnt) : 0, count: cnt };
  }, [mealsByDay]);

  if (mealsLoading) return <LoadingState label="Chargement nutrition..." />;
  if (count === 0 && mealsByDay.length > 0) return <EmptyState Icon={Flame} label="Aucun repas enregistré sur la période" />;

  return (
    <div className="space-y-8">
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <span className="awan-label text-awan-tx-mute mb-2 block">KCAL · AUJOURD'HUI</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-awan-gold tracking-tighter">
            {todayKcal || '—'}
          </span>
          {todayKcal > 0 && (
            <span className="text-awan-md font-mono text-awan-tx-mute">
              · P {todayP}g · G {todayC}g · L {todayF}g
            </span>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6 bg-white/5 border-white/5" variant="flat">
          <div className="flex flex-row items-center gap-2 mb-3">
            <Flame size={12} className="text-awan-gold" />
            <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">Moy. Kcal</span>
          </div>
          <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{avgKcal || '—'}</span>
        </Card>
        <Card className="p-6 bg-white/5 border-white/5" variant="flat">
          <div className="flex flex-row items-center gap-2 mb-3">
            <Activity size={12} className="text-awan-status-error" />
            <span className="text-awan-sm font-black text-awan-status-error tracking-widest uppercase">Moy. Prot</span>
          </div>
          <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">
            {avgP || '—'}{avgP > 0 && <span className="text-sm ml-1">G</span>}
          </span>
        </Card>
      </div>

      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Énergie">FLUX CALORIQUE</Heading>
        <div className="h-[200px] mt-6">
          <BarChart data={mealsByDay} dataKey="kcal" color={theme.title} />
        </div>
      </Card>
    </div>
  );
}
