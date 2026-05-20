import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { Compass, BookOpen, RefreshCcw, Clock, CheckCircle2, Plus, TrendingUp, Minus, ChevronLeft, ChevronRight, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpiritualService } from '../utils/spiritualService';
import arabicData from '../assets/data/1.json';
import { PageWrapper } from '../components/Animated';
import { ds } from '../utils/storage';
import { safeStorage } from '../utils/safeStorage';
import { useAppState } from '../context/AppStateContext';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useQuranStore } from '../hooks/useQuranStore';
import type { PrayerName } from '../data/schemas/islam/prayerLog';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

// ─── Hijri calendar utilities ──────────────────────────────────────────────────

function gToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mn = m + 12 * a - 3;
  return d + Math.floor((153 * mn + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
}

function jdnToG(jdn: number): [number, number, number] {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const mn = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * mn + 2) / 5) + 1;
  const month = mn + 3 - 12 * Math.floor(mn / 10);
  const year = 100 * b + d - 4800 + Math.floor(mn / 10);
  return [year, month, day];
}

function jdnToH(jdn: number): [number, number, number] {
  const l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hm = Math.floor((24 * l3) / 709);
  const hd = l3 - Math.floor((709 * hm) / 24);
  return [30 * n + j - 30, hm, hd];
}

function hToJdn(hy: number, hm: number, hd: number): number {
  return hd + Math.ceil((29 * hm - 29) / 30) + (hy - 1) * 354 + Math.floor((3 + 11 * hy) / 30) + 1948440 - 385;
}

function gToH(y: number, m: number, d: number): [number, number, number] {
  return jdnToH(gToJdn(y, m, d));
}

function hijriDaysInMonth(hm: number): number {
  return hm % 2 === 1 ? 30 : 29;
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi\' al-Awwal', 'Rabi\' al-Akhir',
  'Jumada al-Ula', 'Jumada al-Akhira', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah',
];

const ISLAMIC_HOLIDAYS: [number, number, string][] = [
  [1, 1,   'Nouvel An'],
  [1, 10,  'Achoura'],
  [3, 12,  'Mawlid'],
  [7, 27,  'Isra Mi\'raj'],
  [9, 1,   'Ramadan'],
  [9, 27,  'Laylat al-Qadr'],
  [10, 1,  'Aïd al-Fitr'],
  [12, 9,  'Arafat'],
  [12, 10, 'Aïd al-Adha'],
  [12, 11, 'Tashriq'],
  [12, 12, 'Tashriq'],
  [12, 13, 'Tashriq'],
];

function hijriHoliday(hm: number, hd: number): string | null {
  const found = ISLAMIC_HOLIDAYS.find(([m, d]) => m === hm && d === hd);
  return found ? found[2] : null;
}

const WEEKDAYS_FR = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function HijriCalendar({
  hijriYear, hijriMonth, onSelect, selectedDate, todayStr,
}: {
  hijriYear: number; hijriMonth: number;
  onSelect: (dateStr: string) => void; selectedDate: string; todayStr: string;
}) {
  const days = hijriDaysInMonth(hijriMonth);
  const firstJdn = hToJdn(hijriYear, hijriMonth, 1);
  const firstDow = (firstJdn + 1) % 7; // 0=Sun

  const cells: { hd: number; gStr: string; dow: number; jdn: number }[] = [];
  for (let hd = 1; hd <= days; hd++) {
    const jdn = firstJdn + hd - 1;
    const [gy, gm, gd] = jdnToG(jdn);
    const gStr = `${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`;
    cells.push({ hd, gStr, dow: (firstDow + hd - 1) % 7, jdn });
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_FR.map((d, i) => (
          <span key={i} className="text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.1em' }}>{d}</span>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells before first day */}
        {Array.from({ length: cells[0]?.dow ?? 0 }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {cells.map(({ hd, gStr, jdn }) => {
          const [,, gd] = jdnToG(jdn);
          const isToday = gStr === todayStr;
          const isSelected = gStr === selectedDate;
          const holiday = hijriHoliday(hijriMonth, hd);
          return (
            <Touch key={hd} onPress={() => onSelect(gStr)}>
              <div
                className="flex flex-col items-center py-1 border"
                style={{
                  backgroundColor: isSelected ? 'var(--color-awan-gold)' : isToday ? 'rgba(212,175,55,0.12)' : 'transparent',
                  borderColor: isToday ? 'var(--color-awan-gold)' : holiday ? 'rgba(212,175,55,0.3)' : 'var(--color-awan-border-soft)',
                  minHeight: 38,
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: isSelected ? 'var(--color-awan-bg)' : isToday ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)', lineHeight: 1.2 }}>
                  {hd}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: isSelected ? 'var(--color-awan-bg)' : 'var(--color-awan-tx-mute)', lineHeight: 1 }}>
                  {gd}
                </span>
                {holiday && (
                  <div style={{ width: 4, height: 4, backgroundColor: isSelected ? 'var(--color-awan-bg)' : 'var(--color-awan-gold)', borderRadius: 0, marginTop: 1 }} />
                )}
              </div>
            </Touch>
          );
        })}
      </div>
      {/* Holiday legend for this month */}
      {ISLAMIC_HOLIDAYS.filter(([m]) => m === hijriMonth).map(([, hd, name]) => (
        <div key={`${hijriMonth}-${hd}`} className="flex flex-row items-center gap-2 mt-1">
          <div style={{ width: 4, height: 4, backgroundColor: 'var(--color-awan-gold)', borderRadius: 0, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.15em' }}>
            {hd} — {name}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Prayer notifications ────────────────────────────────────────────────────────

async function schedulePrayerNotifications(times: Record<string, unknown>): Promise<void> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }
    await LocalNotifications.cancel({ notifications: [
      { id: 1001 }, { id: 1002 }, { id: 1003 }, { id: 1004 }, { id: 1005 },
    ]});
    const prayers = [
      { id: 1001, name: 'Fajr',    time: times['fajr'] as Date },
      { id: 1002, name: 'Dhuhr',   time: times['dhuhr'] as Date },
      { id: 1003, name: 'Asr',     time: times['asr'] as Date },
      { id: 1004, name: 'Maghrib', time: times['maghrib'] as Date },
      { id: 1005, name: 'Isha',    time: times['isha'] as Date },
    ];
    const now = new Date();
    const future = prayers.filter(p => p.time instanceof Date && p.time > now);
    if (future.length === 0) return;
    await LocalNotifications.schedule({
      notifications: future.map(p => ({
        id: p.id,
        title: 'AWAN · ISLAM',
        body: `${p.name} — heure de la prière`,
        schedule: { at: p.time },
      })),
    });
  } catch { /* notifications non supportées sur ce contexte */ }
}

async function cancelPrayerNotifications(): Promise<void> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [
      { id: 1001 }, { id: 1002 }, { id: 1003 }, { id: 1004 }, { id: 1005 },
    ]});
  } catch { /* ok */ }
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function IslamScreen() {
  useAppState() as any;

  const todayStr = ds(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [editMode, setEditMode] = useState(false);
  const [prayerTimesForDate, setPrayerTimesForDate] = useState<any>(() => SpiritualService.getPrayerTimes());
  const [showQibla, setShowQibla] = useState(false);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ok' | 'cached' | 'denied'>('idle');
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [calView, setCalView] = useState<'month' | 'year'>('month');
  const [notifEnabled, setNotifEnabled] = useState(
    () => safeStorage.get('awan.islam.notifications') !== '0',
  );

  const prayerStore = usePrayerStore(selectedDate);
  const quranStore = useQuranStore();

  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;

  // Hijri navigation state
  const todayH = useMemo(() => {
    const now = new Date();
    return gToH(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);
  const [hijriYear, setHijriYear] = useState(todayH[0]);
  const [hijriMonth, setHijriMonth] = useState(todayH[1]);

  useEffect(() => {
    const loc = SpiritualService.getCachedLocation();
    const times = SpiritualService.getPrayerTimes(loc.lat, loc.lon);
    setPrayerTimesForDate(times);
    if (notifEnabled) void schedulePrayerNotifications(times);
    const timer = setInterval(() => {
      const l = SpiritualService.getCachedLocation();
      setPrayerTimesForDate(SpiritualService.getPrayerTimes(l.lat, l.lon));
    }, 60_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pickNewWord();
  }, []);

  const pickNewWord = () => {
    setCurrentWord(arabicData[Math.floor(Math.random() * arabicData.length)]);
    setShowAnswer(false);
  };

  const activateQibla = () => {
    if (!navigator.geolocation) {
      setQiblaAngle(SpiritualService.getQiblaAngle());
      setLocationStatus('cached');
      setShowQibla(true);
      return;
    }
    setLocationStatus('loading');
    setShowQibla(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        safeStorage.set('awan.user.location', JSON.stringify({ lat, lon }));
        setQiblaAngle(SpiritualService.getQiblaAngle(lat, lon));
        setPrayerTimesForDate(SpiritualService.getPrayerTimes(lat, lon));
        setLocationStatus('ok');
      },
      () => {
        setQiblaAngle(SpiritualService.getQiblaAngle());
        setLocationStatus(safeStorage.get('awan.user.location') ? 'cached' : 'denied');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 3_600_000 },
    );
  };

  useEffect(() => {
    if (!showQibla) return;
    const handler = (e: DeviceOrientationEvent) => {
      const wch = (e as any).webkitCompassHeading;
      const heading = wch != null ? wch : e.alpha != null ? (360 - e.alpha) % 360 : null;
      if (heading != null) setCompassHeading(heading);
    };
    const attach = () => {
      window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.addEventListener('deviceorientation', handler as EventListener, true);
    };
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((s: string) => { if (s === 'granted') attach(); });
    } else {
      attach();
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.removeEventListener('deviceorientation', handler as EventListener, true);
    };
  }, [showQibla]);

  const prevMonth = () => {
    if (hijriMonth === 1) { setHijriMonth(12); setHijriYear(y => y - 1); }
    else setHijriMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (hijriMonth === 12) { setHijriMonth(1); setHijriYear(y => y + 1); }
    else setHijriMonth(m => m + 1);
  };

  const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const canEdit = isPast || isToday;

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="ISLAM" />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <InstrumentCard
            label="PRIÈRES"
            value={prayerStore.doneCount}
            unit={`/${prayerStore.total}`}
            status={prayerStore.doneCount >= prayerStore.total ? 'ok' : prayerStore.doneCount > 0 ? 'warn' : 'mute'}
            progress={prayerStore.total > 0 ? Math.round((prayerStore.doneCount / prayerStore.total) * 100) : 0}
            index={1}
          />
          <InstrumentCard
            label="QIBLA"
            value={showQibla ? `${Math.round(qiblaAngle)}°` : '—'}
            status={showQibla ? 'spirit' : 'mute'}
            index={2}
            onPress={activateQibla}
          />
        </div>

        {/* ── Toggle notifications ──────────────────────────────────────────── */}
        <Touch onPress={() => {
          const next = !notifEnabled;
          setNotifEnabled(next);
          safeStorage.set('awan.islam.notifications', next ? '1' : '0');
          if (next) void schedulePrayerNotifications(prayerTimesForDate as Record<string, unknown>);
          else void cancelPrayerNotifications();
        }}>
          <div className="flex flex-row items-center justify-between mb-3 px-4 py-3 border" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'var(--color-awan-surface)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.2em' }}>RAPPELS PRIÈRES</span>
            <div style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative',
              backgroundColor: notifEnabled ? 'var(--color-awan-gold)' : 'rgba(255,255,255,0.12)',
              transition: 'background-color 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: notifEnabled ? 18 : 2,
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: 'var(--color-awan-bg)',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        </Touch>

        {/* ── Sélecteur de date ──────────────────────────────────────────────── */}
        <div className="flex flex-row items-center justify-between mb-3 p-3 border" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'var(--color-awan-surface)' }}>
          <Touch onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(ds(d));
          }}>
            <ChevronLeft size={18} color="var(--color-awan-gold)" />
          </Touch>
          <div className="flex flex-col items-center">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
              {isToday ? 'AUJOURD\'HUI' : selectedDate}
            </span>
            {(() => {
              const [hy, hm, hd] = gToH(...(selectedDate.split('-').map(Number) as [number, number, number]));
              return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.05em' }}>
                  {hd} {HIJRI_MONTHS[hm - 1]} {hy}
                </span>
              );
            })()}
          </div>
          <Touch onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            if (ds(d) <= todayStr) setSelectedDate(ds(d));
          }} disabled={isToday}>
            <ChevronRight size={18} color={isToday ? 'var(--color-awan-tx-mute)' : 'var(--color-awan-gold)'} />
          </Touch>
        </div>

        {/* ── Chrono prières ────────────────────────────────────────────────── */}
        <div className="mb-4 border" style={{ borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="flex flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-awan-border)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.2em' }}>CHRONO PRIÈRES</span>
            {isPast && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-mute)' }}>
                tap pour modifier
              </span>
            )}
          </div>
          {prayers.map((key) => {
            const time: Date | undefined = (prayerTimesForDate as Record<string, Date | undefined>)[key];
            const isNext = isToday && prayerTimesForDate.next === key;
            const isSunrise = key === 'sunrise';
            const done = !isSunrise && prayerStore.isDone(key as PrayerName);
            const timeLabel = time instanceof Date
              ? `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
              : '--:--';
            const canToggle = !isSunrise && (isToday || isPast);

            return (
              <Touch
                key={key}
                onPress={() => canToggle && prayerStore.toggle(key as PrayerName)}
                className="flex flex-row justify-between items-center px-4 py-4 border-b"
                style={{ borderColor: 'var(--color-awan-border-soft)', backgroundColor: isNext ? 'rgba(212,175,55,0.06)' : done ? 'rgba(78,205,196,0.04)' : 'transparent' }}
              >
                <div className="flex flex-row items-center gap-3">
                  <div style={{ width: 3, height: 32, backgroundColor: done ? 'var(--color-awan-status-ok)' : isNext ? 'var(--color-awan-gold)' : 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: done ? 'var(--color-awan-status-ok)' : isNext ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)' }}>
                    {SpiritualService.translatePrayer(key)}
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: done ? 'var(--color-awan-status-ok)' : isNext ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)' }}>
                    {timeLabel}
                  </span>
                  {isSunrise ? <div style={{ width: 16 }} /> : done ? (
                    <CheckCircle2 size={16} color="var(--color-awan-status-ok)" />
                  ) : isNext ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <Clock size={16} color="var(--color-awan-gold)" />
                    </motion.div>
                  ) : (
                    <div style={{ width: 16, height: 16, border: '1px solid rgba(255,255,255,0.2)' }} />
                  )}
                </div>
              </Touch>
            );
          })}
        </div>

        {/* ── Qibla compass ─────────────────────────────────────────────────── */}
        <Touch onPress={activateQibla} className="block mb-4">
          <div className="flex flex-row items-center gap-4 p-4 border" style={{ borderColor: 'rgba(212,175,55,0.25)', backgroundColor: 'rgba(212,175,55,0.04)' }}>
            <div className="p-3 border" style={{ borderColor: 'var(--color-awan-gold)', backgroundColor: 'rgba(212,175,55,0.1)' }}>
              <Compass size={22} color="var(--color-awan-gold)" />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--color-awan-gold)', letterSpacing: '0.2em' }}>
              INSTRUMENT DE QIBLA
            </span>
          </div>
        </Touch>

        <AnimatePresence>
          {showQibla && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 border overflow-hidden flex flex-col items-center p-8"
              style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'var(--color-awan-surface)' }}
            >
              {locationStatus === 'loading' ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                    <Compass size={32} color="var(--color-awan-gold)" />
                  </motion.div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>ACQUISITION GPS...</span>
                </div>
              ) : (
                <>
                  {/* Two-needle compass */}
                  <div style={{ width: 208, height: 208, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    {/* Cardinal marks */}
                    {(['N','E','S','O'] as const).map((dir, i) => {
                      const angle = i * 90;
                      const rad = (angle - 90) * Math.PI / 180;
                      const r = 88;
                      return (
                        <span key={dir} style={{ position: 'absolute', left: `calc(50% + ${r * Math.cos(rad)}px - 5px)`, top: `calc(50% + ${r * Math.sin(rad)}px - 7px)`, fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, color: dir === 'N' ? 'var(--color-awan-tx)' : 'rgba(255,255,255,0.2)' }}>
                          {dir}
                        </span>
                      );
                    })}
                    <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.08)' }} />

                    {/* North needle — title color */}
                    <motion.div
                      animate={{ rotate: compassHeading !== null ? -compassHeading : 0 }}
                      style={{ position: 'absolute', width: 4, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}
                      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                    >
                      <div style={{ width: 4, height: 70, backgroundColor: 'var(--color-awan-tx)', opacity: 0.7 }} />
                      <div style={{ width: 4, height: 70, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    </motion.div>

                    {/* Qibla needle — gold */}
                    <motion.div
                      animate={{ rotate: compassHeading !== null ? qiblaAngle - compassHeading : qiblaAngle }}
                      style={{ position: 'absolute', width: 3, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 11 }}
                      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                    >
                      <div style={{ width: 3, height: 70, backgroundColor: 'var(--color-awan-gold)', boxShadow: '0 0 12px var(--color-awan-gold)' }} />
                      <div style={{ width: 3, height: 70, backgroundColor: 'rgba(212,175,55,0.2)' }} />
                    </motion.div>

                    {/* Center hub */}
                    <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'var(--color-awan-bg)', border: '2px solid var(--color-awan-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--color-awan-gold)' }}>{Math.round(qiblaAngle)}°</span>
                    </div>
                  </div>

                  <div className="flex flex-row items-center gap-4 mt-6">
                    <div className="flex flex-row items-center gap-2">
                      <div style={{ width: 12, height: 3, backgroundColor: 'var(--color-awan-tx)', opacity: 0.7 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>NORD</span>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                      <div style={{ width: 12, height: 3, backgroundColor: 'var(--color-awan-gold)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.2em' }}>QIBLA</span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2 mt-3">
                    <div style={{ width: 6, height: 6, backgroundColor: locationStatus === 'ok' ? 'var(--color-awan-status-ok)' : locationStatus === 'cached' ? 'var(--color-awan-gold)' : 'var(--color-awan-status-warn)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>
                      {locationStatus === 'ok' ? 'GPS ACTIF' : locationStatus === 'cached' ? 'POSITION MÉMORISÉE' : 'DÉFAUT'}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendrier hégirien ───────────────────────────────────────────── */}
        <div className="mb-4 border" style={{ borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="flex flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-awan-border)' }}>
            <div className="flex flex-row gap-2">
              <Touch onPress={() => setCalView('month')}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: calView === 'month' ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>MOIS</span>
              </Touch>
              <span style={{ color: 'var(--color-awan-tx-mute)', opacity: 0.3 }}>·</span>
              <Touch onPress={() => setCalView('year')}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: calView === 'year' ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>ANNÉE</span>
              </Touch>
            </div>
            <div className="flex flex-row items-center gap-3">
              <Touch onPress={prevMonth}><ChevronLeft size={16} color="var(--color-awan-gold)" /></Touch>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.05em' }}>
                {HIJRI_MONTHS[hijriMonth - 1]} {hijriYear}
              </span>
              <Touch onPress={nextMonth}><ChevronRight size={16} color="var(--color-awan-gold)" /></Touch>
            </div>
          </div>

          <div className="p-4">
            {calView === 'month' ? (
              <HijriCalendar
                hijriYear={hijriYear}
                hijriMonth={hijriMonth}
                onSelect={setSelectedDate}
                selectedDate={selectedDate}
                todayStr={todayStr}
              />
            ) : (
              /* Annual view — list of months */
              <div className="flex flex-col gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const hm = i + 1;
                  const monthName = HIJRI_MONTHS[i];
                  const firstJdn = hToJdn(hijriYear, hm, 1);
                  const [gy, gm] = jdnToG(firstJdn);
                  const gregLabel = new Date(gy, gm - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  const holidays = ISLAMIC_HOLIDAYS.filter(([m]) => m === hm);
                  return (
                    <Touch key={hm} onPress={() => { setHijriMonth(hm); setCalView('month'); }}>
                      <div className="flex flex-row items-start justify-between p-3 border" style={{ borderColor: hm === hijriMonth ? 'var(--color-awan-gold)' : 'var(--color-awan-border)', backgroundColor: hm === hijriMonth ? 'rgba(212,175,55,0.06)' : 'transparent' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: hm === hijriMonth ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)', letterSpacing: '0.1em' }}>{monthName}</span>
                          <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', marginTop: 2 }}>{gregLabel}</span>
                        </div>
                        {holidays.length > 0 && (
                          <div className="flex flex-col items-end gap-1">
                            {holidays.map(([, hd, name]) => (
                              <span key={`${hm}-${hd}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.1em' }}>{hd} {name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Touch>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Progression Coran ─────────────────────────────────────────────── */}
        <div className="mb-4 border" style={{ borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-awan-border)' }}>
            <div className="flex flex-row items-center justify-between">
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.2em' }}>PROGRESSION CORAN</span>
              <TrendingUp size={14} color="var(--color-awan-gold)" />
            </div>
          </div>
          <div className="p-4">
            {quranStore.progress ? (
              <div>
                <div className="flex flex-row justify-between items-center mb-4">
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.2em', display: 'block', marginBottom: 4 }}>SOURATE</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--color-awan-tx)' }}>{quranStore.progress.currentSurah}<span style={{ fontSize: '11px', color: 'var(--color-awan-tx-mute)' }}>/114</span></span>
                  </div>
                  <div className="text-right">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', display: 'block', marginBottom: 4 }}>VERSET</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--color-awan-tx)' }}>{quranStore.progress.currentAyah}</span>
                  </div>
                  <div className="text-right">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', display: 'block', marginBottom: 4 }}>TOTAL LU</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--color-awan-tx)' }}>{quranStore.progress.totalAyahsRead}</span>
                  </div>
                </div>
                <div className="h-px mb-4" style={{ backgroundColor: 'var(--color-awan-border)' }} />
                <div className="flex flex-row gap-2">
                  <Touch onPress={() => quranStore.advance(1)} className="flex-1 flex items-center justify-center gap-2 p-3 border" style={{ borderColor: 'rgba(212,175,55,0.3)', backgroundColor: 'rgba(212,175,55,0.06)' }}>
                    <Plus size={14} color="var(--color-awan-gold)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-gold)', letterSpacing: '0.2em' }}>+1</span>
                  </Touch>
                  <Touch onPress={() => quranStore.advance(5)} className="flex-1 flex items-center justify-center gap-2 p-3" style={{ backgroundColor: 'var(--color-awan-gold)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-bg)', letterSpacing: '0.2em' }}>+5</span>
                  </Touch>
                  <Touch onPress={() => quranStore.advance(-1)} className="flex items-center justify-center p-3 border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Minus size={14} color="var(--color-awan-tx-mute)" />
                  </Touch>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center gap-4">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>AUCUNE PROGRESSION</span>
                <Touch onPress={() => quranStore.advance(0)} className="flex items-center justify-center px-6 py-3" style={{ backgroundColor: 'var(--color-awan-gold)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-bg)', letterSpacing: '0.2em' }}>INITIALISER</span>
                </Touch>
              </div>
            )}
          </div>
        </div>

        {/* ── Vocabulaire ───────────────────────────────────────────────────── */}
        <div className="mb-8 border" style={{ borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="flex flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-awan-border)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.2em' }}>VOCABULAIRE</span>
            <div className="flex flex-row items-center gap-2">
              <BookOpen size={13} color="var(--color-awan-tx-mute)" />
              <Touch onPress={pickNewWord}>
                <RefreshCcw size={13} color="var(--color-awan-tx-mute)" />
              </Touch>
            </div>
          </div>
          <div className="p-6">
            {currentWord ? (
              <div className="flex flex-col items-center">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.4em', marginBottom: 16, opacity: 0.6 }}>
                  {currentWord.category?.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--color-awan-tx)', textAlign: 'center', marginBottom: 24, letterSpacing: '0.05em' }}>
                  {currentWord.fr}
                </span>
                <AnimatePresence mode="wait">
                  {!showAnswer ? (
                    <Touch onPress={() => setShowAnswer(true)} className="w-full flex items-center justify-center py-3" style={{ backgroundColor: 'var(--color-awan-gold)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-bg)', letterSpacing: '0.3em' }}>RÉVÉLER</span>
                    </Touch>
                  ) : (
                    <motion.div key="answer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full">
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '52px', fontWeight: 700, color: 'var(--color-awan-gold)', marginBottom: 8 }}>{currentWord.ar}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
                        [{currentWord.phonetic?.toUpperCase()}]
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-12 flex items-center justify-center">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' }}>CHARGEMENT...</span>
              </div>
            )}
          </div>
        </div>
      </ScrollView>
    </PageWrapper>
  );
}
