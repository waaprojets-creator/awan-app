import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { Compass, BookOpen, RefreshCcw, Clock, CheckCircle2, Plus, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SpiritualService } from '../utils/spiritualService';
import arabicData from '../assets/data/1.json';
import { ds } from '../utils/storage';
import { safeStorage } from '../utils/safeStorage';
import { useAppState } from '../context/AppStateContext';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useQuranStore } from '../hooks/useQuranStore';
import { useQuranSessionStore } from '../hooks/useQuranSessionStore';
import type { PrayerName } from '../data/schemas/islam/prayerLog';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono, FwMute, FwBody, FwLabel, FwValue, FwDisplay } from '../constants/typography';

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
  [1, 1,   'Nouvel An'], [1, 10, 'Achoura'], [3, 12, 'Mawlid'],
  [7, 27,  'Isra Mi\'raj'], [9, 1, 'Ramadan'], [9, 27, 'Laylat al-Qadr'],
  [10, 1,  'Aïd al-Fitr'], [12, 9, 'Arafat'], [12, 10, 'Aïd al-Adha'],
  [12, 11, 'Tashriq'], [12, 12, 'Tashriq'], [12, 13, 'Tashriq'],
];

function hijriHoliday(hm: number, hd: number): string | null {
  const found = ISLAMIC_HOLIDAYS.find(([m, d]) => m === hm && d === hd);
  return found ? found[2] : null;
}

const WEEKDAYS_FR = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function HijriCalendar({ hijriYear, hijriMonth, onSelect, selectedDate, todayStr }: {
  hijriYear: number; hijriMonth: number;
  onSelect: (dateStr: string) => void; selectedDate: string; todayStr: string;
}) {
  const theme = useTheme();
  const days = hijriDaysInMonth(hijriMonth);
  const firstJdn = hToJdn(hijriYear, hijriMonth, 1);
  const firstDow = (firstJdn + 1) % 7;

  const cells: { hd: number; gStr: string; dow: number; jdn: number }[] = [];
  for (let hd = 1; hd <= days; hd++) {
    const jdn = firstJdn + hd - 1;
    const [gy, gm, gd] = jdnToG(jdn);
    const gStr = `${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`;
    cells.push({ hd, gStr, dow: (firstDow + hd - 1) % 7, jdn });
  }

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS_FR.map((d, i) => (
          <View key={i} style={{ width: '14.28%', alignItems: 'center' }}>
            <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.mute, letterSpacing: 1.0 }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: cells[0]?.dow ?? 0 }).map((_, i) => (
          <View key={`e${i}`} style={{ width: '14.28%' }} />
        ))}
        {cells.map(({ hd, gStr, jdn }) => {
          const [,, gd] = jdnToG(jdn);
          const isToday = gStr === todayStr;
          const isSelected = gStr === selectedDate;
          const holiday = hijriHoliday(hijriMonth, hd);
          return (
            <Touch key={hd} onPress={() => onSelect(gStr)} style={{ width: '14.28%' }}>
              <View style={[s.calCell, {
                backgroundColor: isSelected ? theme.selected : isToday ? 'rgba(212,175,55,0.12)' : 'transparent',
                borderColor: isToday ? theme.selected : holiday ? 'rgba(212,175,55,0.3)' : theme.borderSoft,
                minHeight: 38,
              }]}>
                <Text style={{ fontFamily: FontMono, fontSize: 12, fontWeight: FwValue, color: isSelected ? theme.bg : isToday ? theme.selected : theme.title, lineHeight: 14 }}>
                  {hd}
                </Text>
                <Text style={{ fontFamily: FontMono, fontSize: 8, color: isSelected ? theme.bg : theme.mute, lineHeight: 9 }}>
                  {gd}
                </Text>
                {holiday && (
                  <View style={{ width: 4, height: 4, backgroundColor: isSelected ? theme.bg : theme.selected, marginTop: 1 }} />
                )}
              </View>
            </Touch>
          );
        })}
      </View>
      {ISLAMIC_HOLIDAYS.filter(([m]) => m === hijriMonth).map(([, hd, name]) => (
        <View key={`${hijriMonth}-${hd}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={{ width: 4, height: 4, backgroundColor: theme.selected }} />
          <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.selected, letterSpacing: 1.5 }}>
            {hd} — {name}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Prayer notifications ────────────────────────────────────────────────────────

async function schedulePrayerNotifications(times: Record<string, unknown>): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: next } = await Notifications.requestPermissionsAsync();
      if (next !== 'granted') return;
    }
    for (const id of ['1001', '1002', '1003', '1004', '1005']) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    const prayers = [
      { id: '1001', name: 'Fajr',    time: times['fajr'] as Date },
      { id: '1002', name: 'Dhuhr',   time: times['dhuhr'] as Date },
      { id: '1003', name: 'Asr',     time: times['asr'] as Date },
      { id: '1004', name: 'Maghrib', time: times['maghrib'] as Date },
      { id: '1005', name: 'Isha',    time: times['isha'] as Date },
    ];
    const now = new Date();
    for (const p of prayers.filter(p => p.time instanceof Date && p.time > now)) {
      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: { title: 'AWAN · ISLAM', body: `${p.name} — heure de la prière`, sound: true },
        trigger: { date: p.time } as any,
      });
    }
  } catch { /* notifications non supportées */ }
}

async function cancelPrayerNotifications(): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    for (const id of ['1001', '1002', '1003', '1004', '1005']) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  } catch { /* ok */ }
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function IslamScreen() {
  const theme = useTheme();
  useAppState() as any;

  const todayStr = ds(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [prayerTimesForDate, setPrayerTimesForDate] = useState<any>(() => SpiritualService.getPrayerTimes());
  const [showQibla, setShowQibla] = useState(false);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ok' | 'cached' | 'denied'>('idle');
  const [northRot, setNorthRot] = useState(0);
  const [qiblaRot, setQiblaRot] = useState(0);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [calView, setCalView] = useState<'month' | 'year'>('month');
  const [notifEnabled, setNotifEnabled] = useState(
    () => safeStorage.get('awan.islam.notifications') !== '0',
  );

  const prayerStore = usePrayerStore(selectedDate);
  const quranStore = useQuranStore();
  const quranSessionStore = useQuranSessionStore(selectedDate);

  const [wirdAyahs, setWirdAyahs] = useState('');
  const [wirdTime, setWirdTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  });
  const [wirdError, setWirdError] = useState<string | null>(null);
  const [sessionAyahs, setSessionAyahs] = useState('');
  const [sessionTime, setSessionTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;

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

  useEffect(() => { pickNewWord(); }, []);

  // J0: static qibla display — expo-sensors compass integrated in J0.4+
  useEffect(() => {
    if (!showQibla) return;
    setNorthRot(0);
    setQiblaRot(qiblaAngle);
  }, [showQibla, qiblaAngle]);

  const pickNewWord = () => {
    setCurrentWord(arabicData[Math.floor(Math.random() * arabicData.length)]);
    setShowAnswer(false);
  };

  const activateQibla = () => {
    setLocationStatus('loading');
    setShowQibla(true);
    const cached = safeStorage.get('awan.user.location');
    if (cached) {
      try {
        const { lat, lon } = JSON.parse(cached);
        setQiblaAngle(SpiritualService.getQiblaAngle(lat, lon));
        setPrayerTimesForDate(SpiritualService.getPrayerTimes(lat, lon));
      } catch {
        setQiblaAngle(SpiritualService.getQiblaAngle());
      }
      setLocationStatus('cached');
    } else {
      setQiblaAngle(SpiritualService.getQiblaAngle());
      setLocationStatus('denied');
    }
  };

  const prevMonth = () => {
    if (hijriMonth === 1) { setHijriMonth(12); setHijriYear(y => y - 1); }
    else setHijriMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (hijriMonth === 12) { setHijriMonth(1); setHijriYear(y => y + 1); }
    else setHijriMonth(m => m + 1);
  };

  type PrayerType = 'sunnah' | 'fard' | 'info';
  const PRAYER_ROWS: { key: string; timeSource: string; type: PrayerType }[] = [
    { key: 'fajr_sunnah', timeSource: 'fajr',    type: 'sunnah' },
    { key: 'sobh',        timeSource: 'fajr',    type: 'fard'   },
    { key: 'sunrise',     timeSource: 'sunrise', type: 'info'   },
    { key: 'dhuhr',       timeSource: 'dhuhr',   type: 'fard'   },
    { key: 'asr',         timeSource: 'asr',     type: 'fard'   },
    { key: 'maghrib',     timeSource: 'maghrib', type: 'fard'   },
    { key: 'isha',        timeSource: 'isha',    type: 'fard'   },
    { key: 'witr',        timeSource: 'isha',    type: 'sunnah' },
  ];
  const canEdit = isPast || isToday;

  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({});
  const setDraftTime = (key: string, value: string) =>
    setDraftTimes(prev => ({ ...prev, [key]: value }));
  const currentHHMM = (): string => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 }}
        style={{ flex: 1, backgroundColor: theme.bg }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="ISLAM" />

        {/* Instruments */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <InstrumentCard
              label="PRIÈRES"
              value={prayerStore.doneCount}
              unit={`/${prayerStore.total}`}
              status={prayerStore.doneCount >= prayerStore.total ? 'ok' : prayerStore.doneCount > 0 ? 'warn' : 'mute'}
              progress={prayerStore.total > 0 ? Math.round((prayerStore.doneCount / prayerStore.total) * 100) : 0}
              index={1}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InstrumentCard
              label="QIBLA"
              value={showQibla ? `${Math.round(qiblaAngle)}°` : '—'}
              status={showQibla ? 'spirit' : 'mute'}
              index={2}
              onPress={activateQibla}
            />
          </View>
        </View>

        {/* Notifications toggle */}
        <Touch onPress={() => {
          const next = !notifEnabled;
          setNotifEnabled(next);
          safeStorage.set('awan.islam.notifications', next ? '1' : '0');
          if (next) void schedulePrayerNotifications(prayerTimesForDate as Record<string, unknown>);
          else void cancelPrayerNotifications();
        }}>
          <View style={[s.row, { justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={{ fontFamily: FontSans, fontSize: 10, fontWeight: FwValue, color: theme.title, letterSpacing: 2.0 }}>RAPPELS PRIÈRES</Text>
            <View style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: notifEnabled ? theme.selected : 'rgba(255,255,255,0.12)' }}>
              <View style={{ position: 'absolute', top: 2, left: notifEnabled ? 18 : 2, width: 16, height: 16, borderRadius: 8, backgroundColor: theme.bg }} />
            </View>
          </View>
        </Touch>

        {/* Sélecteur de date */}
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 12, padding: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Touch onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(ds(d));
          }}>
            <ChevronLeft size={18} color={theme.selected} />
          </Touch>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.mute, letterSpacing: 3.0 }}>
              {isToday ? 'AUJOURD\'HUI' : selectedDate}
            </Text>
            {(() => {
              const [hy, hm, hd] = gToH(...(selectedDate.split('-').map(Number) as [number, number, number]));
              return (
                <Text style={{ fontFamily: FontSans, fontSize: 13, fontWeight: FwValue, color: theme.title, letterSpacing: 0.7 }}>
                  {hd} {HIJRI_MONTHS[hm - 1]} {hy}
                </Text>
              );
            })()}
          </View>
          <Touch onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            if (ds(d) <= todayStr) setSelectedDate(ds(d));
          }} disabled={isToday}>
            <ChevronRight size={18} color={isToday ? theme.mute : theme.selected} />
          </Touch>
        </View>

        {/* Chrono prières */}
        <View style={[s.section, { borderColor: theme.border, marginBottom: 16 }]}>
          <View style={[s.row, { justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={{ fontFamily: FontSans, fontSize: 10, fontWeight: FwValue, color: theme.title, letterSpacing: 2.0 }}>CHRONO PRIÈRES</Text>
            {isPast && (
              <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.mute }}>tap pour modifier</Text>
            )}
          </View>
          {PRAYER_ROWS.map(({ key, timeSource, type }) => {
            const theoTime: Date | undefined = (prayerTimesForDate as Record<string, Date | undefined>)[timeSource];
            const isNext   = isToday && prayerTimesForDate.next === timeSource && type !== 'info';
            const isInfo   = type === 'info';
            const done     = !isInfo && prayerStore.isDone(key as PrayerName);
            const realTime = !isInfo ? prayerStore.realTime(key as PrayerName) : null;
            const theoLabel = theoTime instanceof Date
              ? `${String(theoTime.getHours()).padStart(2, '0')}:${String(theoTime.getMinutes()).padStart(2, '0')}`
              : '--:--';
            const canToggle = !isInfo && canEdit;
            const draftValue = draftTimes[key] ?? realTime ?? (isToday ? currentHHMM() : theoLabel);
            const badge = type === 'sunnah' ? 'SUNNAH' : type === 'fard' ? 'FARD' : null;
            const badgeColor = type === 'sunnah' ? theme.mute : theme.selected;

            return (
              <View
                key={key}
                style={[s.row, { justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSoft,
                  backgroundColor: isNext ? 'rgba(212,175,55,0.06)' : done ? 'rgba(78,205,196,0.04)' : 'transparent',
                }]}
              >
                <View style={[s.row, { flex: 1, gap: 12 }]}>
                  <View style={{ width: 3, height: 32, backgroundColor: done ? theme.statusOk : isNext ? theme.selected : 'rgba(237,232,226,0.12)' }} />
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontFamily: FontSans, fontSize: 11, fontWeight: FwValue, letterSpacing: 1.65, textTransform: 'uppercase',
                      color: done ? theme.statusOk : isNext ? theme.selected : theme.title }}>
                      {SpiritualService.translatePrayer(key)}
                    </Text>
                    <View style={[s.row, { gap: 8 }]}>
                      {badge && (
                        <View style={{ borderWidth: 1, borderColor: badgeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontFamily: FontMono, fontSize: 7, fontWeight: FwValue, letterSpacing: 2.0, color: badgeColor }}>{badge}</Text>
                        </View>
                      )}
                      <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute, letterSpacing: 1.0 }}>
                        THÉO {theoLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[s.row, { gap: 12 }]}>
                  {isInfo ? (
                    <Text style={{ fontFamily: FontMono, fontSize: 18, fontWeight: FwValue, color: theme.mute }}>{theoLabel}</Text>
                  ) : done ? (
                    <>
                      <Text style={{ fontFamily: FontMono, fontSize: 16, fontWeight: FwValue, color: theme.statusOk }}>{realTime ?? '--:--'}</Text>
                      <Touch onPress={() => { void prayerStore.toggle(key as PrayerName); setDraftTime(key, ''); }} disabled={!canToggle}>
                        <CheckCircle2 size={20} color={theme.statusOk} />
                      </Touch>
                    </>
                  ) : (
                    <>
                      <RNTextInput
                        value={draftValue}
                        onChangeText={v => setDraftTime(key, v)}
                        editable={canToggle}
                        keyboardType="numbers-and-punctuation"
                        placeholder="HH:MM"
                        placeholderTextColor={theme.mute}
                        style={{ fontFamily: FontMono, fontSize: 14, fontWeight: FwValue, color: theme.title, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.borderSoft, paddingHorizontal: 6, paddingVertical: 4, width: 72, textAlign: 'center' }}
                      />
                      <Touch onPress={() => { if (canToggle) void prayerStore.toggle(key as PrayerName, draftValue); }} disabled={!canToggle}>
                        {isNext ? (
                          <Clock size={20} color={theme.selected} />
                        ) : (
                          <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: theme.border }} />
                        )}
                      </Touch>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Qibla */}
        <Touch onPress={activateQibla} style={{ marginBottom: 16 }}>
          <View style={[s.row, { gap: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)', backgroundColor: 'rgba(212,175,55,0.04)' }]}>
            <View style={{ padding: 12, borderWidth: 1, borderColor: theme.selected, backgroundColor: 'rgba(212,175,55,0.1)' }}>
              <Compass size={22} color={theme.selected} />
            </View>
            <Text style={{ fontFamily: FontSans, fontSize: 11, fontWeight: FwValue, color: theme.selected, letterSpacing: 2.2 }}>INSTRUMENT DE QIBLA</Text>
          </View>
        </Touch>

        {showQibla && (
          <View style={[s.section, { borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', padding: 32, marginBottom: 16, overflow: 'hidden' }]}>
            {locationStatus === 'loading' ? (
              <View style={{ alignItems: 'center', gap: 16, paddingVertical: 32 }}>
                <Compass size={32} color={theme.selected} />
                <Text style={{ fontFamily: FontMono, fontSize: 10, color: theme.mute, letterSpacing: 3.0 }}>ACQUISITION GPS...</Text>
              </View>
            ) : (
              <>
                <View style={{ width: 208, height: 208, borderRadius: 104, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ position: 'absolute', top: 8, fontFamily: FontMono, fontSize: 8, fontWeight: FwValue, color: theme.title }}>N</Text>
                  <Text style={{ position: 'absolute', bottom: 8, fontFamily: FontMono, fontSize: 8, fontWeight: FwValue, color: 'rgba(255,255,255,0.2)' }}>S</Text>
                  <Text style={{ position: 'absolute', right: 8, fontFamily: FontMono, fontSize: 8, fontWeight: FwValue, color: 'rgba(255,255,255,0.2)' }}>E</Text>
                  <Text style={{ position: 'absolute', left: 8, fontFamily: FontMono, fontSize: 8, fontWeight: FwValue, color: 'rgba(255,255,255,0.2)' }}>O</Text>
                  <View style={{ position: 'absolute', width: 4, height: 140, alignItems: 'center', transform: [{ rotate: `${northRot}deg` }] }}>
                    <View style={{ width: 4, height: 70, backgroundColor: theme.title, opacity: 0.7 }} />
                    <View style={{ width: 4, height: 70, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                  </View>
                  <View style={{ position: 'absolute', width: 3, height: 140, alignItems: 'center', transform: [{ rotate: `${qiblaRot}deg` }] }}>
                    <View style={{ width: 3, height: 70, backgroundColor: theme.selected }} />
                    <View style={{ width: 3, height: 70, backgroundColor: 'rgba(212,175,55,0.2)' }} />
                  </View>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.bg, borderWidth: 2, borderColor: theme.selected, alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                    <Text style={{ fontFamily: FontMono, fontSize: 11, fontWeight: FwValue, color: theme.selected }}>{Math.round(qiblaAngle)}°</Text>
                  </View>
                </View>
                <View style={[s.row, { gap: 16, marginTop: 24 }]}>
                  <View style={[s.row, { gap: 8 }]}>
                    <View style={{ width: 12, height: 3, backgroundColor: theme.title, opacity: 0.7 }} />
                    <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.mute, letterSpacing: 2.0 }}>NORD</Text>
                  </View>
                  <View style={[s.row, { gap: 8 }]}>
                    <View style={{ width: 12, height: 3, backgroundColor: theme.selected }} />
                    <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.selected, letterSpacing: 2.0 }}>QIBLA</Text>
                  </View>
                </View>
                <View style={[s.row, { gap: 8, marginTop: 12 }]}>
                  <View style={{ width: 6, height: 6, backgroundColor: locationStatus === 'ok' ? theme.statusOk : locationStatus === 'cached' ? theme.selected : theme.statusWarn }} />
                  <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute, letterSpacing: 2.0 }}>
                    {locationStatus === 'ok' ? 'GPS ACTIF' : locationStatus === 'cached' ? 'POSITION MÉMORISÉE' : 'DÉFAUT'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Calendrier hégirien */}
        <View style={[s.section, { borderColor: theme.border, marginBottom: 16, overflow: 'hidden' }]}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            {(['month', 'year'] as const).map(v => (
              <Touch key={v} onPress={() => setCalView(v)} style={{ flex: 1 }}>
                <View style={[s.calTab, { borderBottomWidth: 2, borderBottomColor: calView === v ? theme.selected : 'transparent', opacity: calView === v ? 1 : 0.4 }]}>
                  <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: FwValue, color: calView === v ? theme.title : theme.mute, letterSpacing: 2.5 }}>
                    {v === 'month' ? 'MOIS' : 'ANNÉE'}
                  </Text>
                </View>
              </Touch>
            ))}
          </View>
          <View style={[s.row, { justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Touch onPress={prevMonth} style={[s.navBtn, { backgroundColor: theme.surfaceDim, borderColor: theme.border }]}>
              <ChevronLeft size={14} color={theme.mute} />
            </Touch>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: FwValue, color: theme.title, letterSpacing: 2.5 }}>
                {(HIJRI_MONTHS[hijriMonth - 1] ?? '').toUpperCase()}
              </Text>
              <Text style={{ fontFamily: FontMono, fontSize: 8, fontWeight: FwBody, color: theme.selected, letterSpacing: 3.0 }}>
                {hijriYear}
              </Text>
            </View>
            <Touch onPress={nextMonth} style={[s.navBtn, { backgroundColor: theme.surfaceDim, borderColor: theme.border }]}>
              <ChevronRight size={14} color={theme.mute} />
            </Touch>
          </View>

          <View style={{ padding: 16 }}>
            {calView === 'month' ? (
              <HijriCalendar
                hijriYear={hijriYear}
                hijriMonth={hijriMonth}
                onSelect={setSelectedDate}
                selectedDate={selectedDate}
                todayStr={todayStr}
              />
            ) : (
              <View style={{ gap: 8 }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const hm = i + 1;
                  const monthName = HIJRI_MONTHS[i];
                  const firstJdn = hToJdn(hijriYear, hm, 1);
                  const [gy, gm] = jdnToG(firstJdn);
                  const gregLabel = new Date(gy, gm - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  const holidays = ISLAMIC_HOLIDAYS.filter(([m]) => m === hm);
                  return (
                    <Touch key={hm} onPress={() => { setHijriMonth(hm); setCalView('month'); }}>
                      <View style={[s.row, { justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, borderWidth: 1,
                        borderColor: hm === hijriMonth ? theme.selected : theme.border,
                        backgroundColor: hm === hijriMonth ? 'rgba(212,175,55,0.06)' : 'transparent',
                      }]}>
                        <View>
                          <Text style={{ fontFamily: FontSans, fontSize: 12, fontWeight: FwValue, color: hm === hijriMonth ? theme.selected : theme.title, letterSpacing: 1.2 }}>{monthName}</Text>
                          <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.mute, marginTop: 2 }}>{gregLabel}</Text>
                        </View>
                        {holidays.length > 0 && (
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            {holidays.map(([, hd, name]) => (
                              <Text key={`${hm}-${hd}`} style={{ fontFamily: FontMono, fontSize: 8, color: theme.selected, letterSpacing: 1.0 }}>{hd} {name}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </Touch>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Wird coranique */}
        <View style={[s.section, { borderColor: theme.border, marginBottom: 16, overflow: 'hidden' }]}>
          <View style={[s.row, { justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={{ fontFamily: FontSans, fontSize: 10, fontWeight: FwValue, color: theme.title, letterSpacing: 2.0 }}>WIRD CORANIQUE</Text>
            <View style={[s.row, { gap: 12 }]}>
              <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.selected, letterSpacing: 2.0 }}>
                {quranSessionStore.totalAyahs} VERSETS
              </Text>
              <TrendingUp size={14} color={theme.selected} />
            </View>
          </View>

          {quranStore.progress && (
            <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View>
                <Text style={{ fontFamily: FontMono, fontSize: 7, color: theme.mute, letterSpacing: 2.0, marginBottom: 2 }}>SOURATE · VERSET</Text>
                <Text style={{ fontFamily: FontMono, fontSize: 16, fontWeight: FwValue, color: theme.title }}>
                  S{quranStore.progress.currentSurah} · V{quranStore.progress.currentAyah}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: FontMono, fontSize: 7, color: theme.mute, letterSpacing: 2.0, marginBottom: 2 }}>TOTAL GLOBAL</Text>
                <Text style={{ fontFamily: FontMono, fontSize: 16, fontWeight: FwValue, color: theme.selected }}>
                  {quranStore.progress.totalAyahsRead}
                  <Text style={{ fontSize: 9, color: theme.mute, fontWeight: FwBody }}> versets</Text>
                </Text>
              </View>
            </View>
          )}

          {canEdit && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View style={[s.row, { gap: 8, alignItems: 'center' }]}>
                <RNTextInput
                  keyboardType="numeric"
                  placeholder="versets"
                  value={wirdAyahs}
                  onChangeText={v => { setWirdAyahs(v); if (wirdError) setWirdError(null); }}
                  placeholderTextColor={theme.mute}
                  style={{ flex: 1, fontFamily: FontMono, fontSize: 14, fontWeight: FwValue, color: theme.title, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.borderSoft, paddingHorizontal: 10, paddingVertical: 8, textAlign: 'center' }}
                />
                <RNTextInput
                  keyboardType="numbers-and-punctuation"
                  value={wirdTime}
                  onChangeText={v => { setWirdTime(v); if (wirdError) setWirdError(null); }}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.mute}
                  style={{ fontFamily: FontMono, fontSize: 14, fontWeight: FwValue, color: theme.title, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.borderSoft, paddingHorizontal: 8, paddingVertical: 8, width: 84 }}
                />
                <Touch
                  onPress={async () => {
                    const n = parseInt(wirdAyahs, 10);
                    if (!n || n < 1) { setWirdError('Nombre de versets invalide'); return; }
                    if (!wirdTime.match(/^\d{2}:\d{2}$/)) { setWirdError('Heure invalide'); return; }
                    setWirdError(null);
                    await quranSessionStore.add({ timeHHMM: wirdTime, ayahsRead: n });
                    setWirdAyahs('');
                    const now = new Date();
                    setWirdTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
                  }}
                  style={{ padding: 12, backgroundColor: theme.selected, flexShrink: 0 }}
                >
                  <Plus size={18} color={theme.bg} />
                </Touch>
              </View>
              {wirdError && (
                <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.danger, letterSpacing: 1.0, marginTop: 6 }}>
                  {wirdError}
                </Text>
              )}
            </View>
          )}

          <View>
            {quranSessionStore.loading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute, letterSpacing: 2.0 }}>CHARGEMENT...</Text>
              </View>
            ) : quranSessionStore.sessions.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute, letterSpacing: 2.0 }}>AUCUNE SESSION CE JOUR</Text>
              </View>
            ) : (
              quranSessionStore.sessions.map((session, i) => (
                <View
                  key={`${session.timeHHMM}-${i}`}
                  style={[s.row, { justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderSoft }]}
                >
                  <View style={[s.row, { gap: 12 }]}>
                    <View style={{ width: 3, height: 24, backgroundColor: theme.selected }} />
                    <Text style={{ fontFamily: FontMono, fontSize: 12, fontWeight: FwValue, color: theme.mute, letterSpacing: 1.5 }}>
                      {session.timeHHMM}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FontMono, fontSize: 14, fontWeight: FwValue, color: theme.title }}>
                    {session.ayahsRead}
                    <Text style={{ fontSize: 9, color: theme.mute, fontWeight: FwBody }}> versets</Text>
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Vocabulaire */}
        <View style={[s.section, { borderColor: theme.border, marginBottom: 32, overflow: 'hidden' }]}>
          <View style={[s.row, { justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={{ fontFamily: FontSans, fontSize: 10, fontWeight: FwValue, color: theme.title, letterSpacing: 2.0 }}>VOCABULAIRE</Text>
            <View style={[s.row, { gap: 8 }]}>
              <BookOpen size={13} color={theme.mute} />
              <Touch onPress={pickNewWord}>
                <RefreshCcw size={13} color={theme.mute} />
              </Touch>
            </View>
          </View>
          <View style={{ padding: 24 }}>
            {currentWord ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.selected, letterSpacing: 3.2, marginBottom: 16, opacity: 0.6 }}>
                  {currentWord.category?.toUpperCase()}
                </Text>
                <Text style={{ fontFamily: FontSans, fontSize: 20, fontWeight: FwValue, color: theme.title, textAlign: 'center', marginBottom: 24, letterSpacing: 0.7 }}>
                  {currentWord.fr}
                </Text>
                {!showAnswer ? (
                  <Touch onPress={() => setShowAnswer(true)} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: theme.selected }}>
                    <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: FwValue, color: theme.bg, letterSpacing: 3.0 }}>RÉVÉLER</Text>
                  </Touch>
                ) : (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <Text style={{ fontFamily: FontSans, fontSize: 52, fontWeight: FwValue, color: theme.selected, marginBottom: 8 }}>{currentWord.ar}</Text>
                    <Text style={{ fontFamily: FontMono, fontSize: 10, color: theme.mute, letterSpacing: 3.0 }}>
                      [{currentWord.phonetic?.toUpperCase()}]
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FontMono, fontSize: 10, color: theme.mute, letterSpacing: 2.0 }}>CHARGEMENT...</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  section: { borderWidth: 1 },
  calCell: { alignItems: 'center', paddingVertical: 4, borderWidth: 1 },
  calTab: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
