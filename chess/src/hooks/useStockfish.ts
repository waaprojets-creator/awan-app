import { useEffect, useRef, useState } from 'react';
import { getStockfishService, type StockfishService } from '@/services/stockfishService';

export function useStockfish(): { service: StockfishService | null; ready: boolean } {
  const [ready, setReady] = useState(false);
  const serviceRef = useRef<StockfishService | null>(null);

  useEffect(() => {
    const sf = getStockfishService();
    serviceRef.current = sf;
    sf.waitReady().then(() => setReady(true));
    return () => { /* keep singleton alive */ };
  }, []);

  return { service: serviceRef.current, ready };
}
