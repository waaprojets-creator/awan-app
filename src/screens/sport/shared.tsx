import { StyleSheet } from 'react-native';
import type { SetKind } from '../../data/schemas/sport/exerciseSet';
import type { CycleLetter } from '../../data/schemas/sport/routine';
import type { AwanTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import type { MuscleId } from '../../components/BodySvg';

export const ACTIVE_SESSION_KEY = 'awan.sport.activeSession';
export const ROUTINE_DRAFT_KEY = 'awan.sport.routineDraft';

export const CYCLE_LETTERS: (CycleLetter | null)[] = [null, 'A', 'B', 'C', 'D'];

export const SET_KIND_LABEL: Record<SetKind, string> = {
  warmup: 'ÉCHAUF.',
  working: 'WORKING',
  drop: 'DROP',
  failure: 'FAILURE',
};

export function setKindColor(kind: SetKind, theme: AwanTheme): string {
  switch (kind) {
    case 'warmup': return theme.mute;
    case 'working': return theme.selected;
    case 'drop': return '#FB923C';
    case 'failure': return '#F87171';
  }
}

export function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeOneRM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export async function notifyRestEnd(): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') { await Notifications.requestPermissionsAsync(); }
    await Notifications.scheduleNotificationAsync({
      identifier: '9001',
      content: { title: 'AWAN SPORT', body: 'Repos terminé — Série suivante !', sound: true },
      trigger: null,
    });
  } catch {
    /* notifications indisponibles — échec silencieux */
  }
}

// Maps exercise-catalog muscle names to BodySvg MuscleIds. Bilateral muscles split to L/R.
export const MUSCLE_TO_SVG: Partial<Record<string, MuscleId[]>> = {
  chest:      ['chest'],
  back:       ['lats', 'back_lower', 'traps'],
  shoulders:  ['front_delts', 'side_delts', 'rear_delts'],
  biceps:     ['biceps_left', 'biceps_right'],
  triceps:    ['triceps_left', 'triceps_right'],
  forearms:   ['forearms_left', 'forearms_right'],
  quads:      ['quads_left', 'quads_right'],
  hamstrings: ['hamstrings_left', 'hamstrings_right'],
  calves:     ['calves_left', 'calves_right'],
  glutes:     ['glutes'],
  abs:        ['abs'],
  obliques:   ['obliques'],
  traps:      ['traps'],
  lats:       ['lats'],
};

export const MUSCLE_MRV: Record<string, number> = {
  chest: 22, back: 25, shoulders: 26, biceps: 26, triceps: 22,
  quads: 20, hamstrings: 20, calves: 20, glutes: 16, abs: 25,
};

export function volumeToMuscleValues(vol: Record<string, number>): Partial<Record<MuscleId, number>> {
  const result: Partial<Record<MuscleId, number>> = {};
  for (const [muscle, sets] of Object.entries(vol)) {
    const ids = MUSCLE_TO_SVG[muscle.toLowerCase()];
    if (!ids) continue;
    const normalized = Math.min(1, sets / (MUSCLE_MRV[muscle.toLowerCase()] ?? 20));
    for (const id of ids) {
      result[id] = Math.max(result[id] ?? 0, normalized);
    }
  }
  return result;
}

export const ss = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  sm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  smThin: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  md: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
  mdBlack: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
  xs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
  xxs: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xxs_02 },
  iconBtn: { width: 40, height: 40, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: Clr.white5 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 512, alignSelf: 'center', borderTopWidth: 1, borderTopColor: Clr.white10, overflow: 'hidden' },
  grabberWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  grabber: { width: 40, height: 4, backgroundColor: Clr.white20 },
  statHalf: { width: '47%', flexGrow: 1, padding: 16 },
});

