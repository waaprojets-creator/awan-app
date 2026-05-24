import { useEffect, useState } from 'react';
import { getStorage } from '@/data/storage/storageService';
import { useAppStore } from '@/data/store/appStore';

export interface DomainCount {
  id: 'sport' | 'nutrition' | 'planning' | 'islam' | 'sleep' | 'anthropo' | 'journal';
  label: string;
  color: string;
  count: number;
  prefixes: readonly string[];
}

const DOMAINS: Omit<DomainCount, 'count'>[] = [
  { id: 'sport',     label: 'SPORT',      color: 'var(--color-awan-status-error)', prefixes: ['sport.routine', 'sport.session'] },
  { id: 'nutrition', label: 'NUTRITION',  color: 'var(--color-awan-status-ok)',    prefixes: ['nutrition.meal', 'nutrition.water'] },
  { id: 'planning',  label: 'PLANNING',   color: 'var(--color-awan-status-info)',  prefixes: ['planning.task', 'planning.schedule'] },
  { id: 'islam',     label: 'ISLAM',      color: 'var(--color-awan-gold)',         prefixes: ['islam.prayer', 'islam.quran'] },
  { id: 'sleep',     label: 'SOMMEIL',    color: 'var(--color-awan-tx-mute)',      prefixes: ['sleep.entry'] },
  { id: 'anthropo',  label: 'ANTHROPO',   color: 'var(--color-awan-status-warn)',  prefixes: ['anthropo.measurement', 'weight.entry'] },
  { id: 'journal',   label: 'JOURNAL',    color: 'var(--color-awan-tx-dim)',       prefixes: ['journal.entry'] },
];

export function useDbFill(): { domains: DomainCount[]; total: number; loading: boolean } {
  const [domains, setDomains] = useState<DomainCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    (async () => {
      const storage = await getStorage();
      const counts = await Promise.all(
        DOMAINS.map(async (d) => {
          let sum = 0;
          for (const p of d.prefixes) {
            const keys = await storage.list(p);
            sum += keys.length;
          }
          return { ...d, count: sum };
        }),
      );
      if (!active) return;
      const t = counts.reduce((acc, d) => acc + d.count, 0);
      setDomains(counts);
      setTotal(t);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [dataVersion]);

  return { domains, total, loading };
}
