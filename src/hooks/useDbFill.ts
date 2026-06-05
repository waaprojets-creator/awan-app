import { useEffect, useState } from 'react';
import { getStorage } from '@/data/storage/storageService';
import { MAX_DB_BYTES } from '@/data/storage/IStorage';
import { useAppStore } from '@/data/store/appStore';
import { useTheme } from '@/hooks/useTheme';

export interface DomainCount {
  id: 'sport' | 'nutrition' | 'planning' | 'islam' | 'sleep' | 'anthropo' | 'journal';
  label: string;
  color: string;
  count: number;
  prefixes: readonly string[];
}

const DOMAIN_PREFIXES: Omit<DomainCount, 'count' | 'color'>[] = [
  { id: 'sport',     label: 'SPORT',     prefixes: ['sport.routine', 'sport.session'] },
  { id: 'nutrition', label: 'NUTRITION', prefixes: ['nutrition.meal', 'nutrition.water'] },
  { id: 'planning',  label: 'PLANNING',  prefixes: ['planning.task', 'planning.schedule'] },
  { id: 'islam',     label: 'ISLAM',     prefixes: ['islam.prayer', 'islam.quran'] },
  { id: 'sleep',     label: 'SOMMEIL',   prefixes: ['sleep.entry'] },
  { id: 'anthropo',  label: 'ANTHROPO',  prefixes: ['anthropo.measurement', 'weight.entry'] },
  { id: 'journal',   label: 'JOURNAL',   prefixes: ['journal.entry'] },
];

export interface DbFill {
  domains: DomainCount[];
  total: number;
  bytes: number;
  maxBytes: number;
  loading: boolean;
}

export function useDbFill(): DbFill {
  const theme = useTheme();
  const [counts, setCounts] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    (async () => {
      const storage = await getStorage();
      const results = await Promise.all(
        DOMAIN_PREFIXES.map(async (d) => {
          let sum = 0;
          for (const p of d.prefixes) {
            const keys = await storage.list(p);
            sum += keys.length;
          }
          return sum;
        }),
      );
      const sizeBytes = await storage.getSizeBytes();
      if (!active) return;
      setCounts(results);
      setTotal(results.reduce((a, c) => a + c, 0));
      setBytes(sizeBytes);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [dataVersion]);

  const DOMAIN_COLORS = [theme.danger, theme.statusOk, theme.statusInfo, theme.selected, theme.mute, theme.statusWarn, theme.text];

  const domains: DomainCount[] = DOMAIN_PREFIXES.map((d, i) => ({
    ...d,
    color: DOMAIN_COLORS[i] ?? theme.mute,
    count: counts[i] ?? 0,
  }));

  return { domains, total, bytes, maxBytes: MAX_DB_BYTES, loading };
}
