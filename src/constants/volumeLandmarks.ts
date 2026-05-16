export interface VolumeLandmark {
  mev: number;
  mav: [number, number];
  mrv: number;
  label: string;
}

// Source : Israetel / Renaissance Periodization — Volume Bible 2020
// Valeurs en séries par semaine (Phase 1 MEV/MAV — ajuster pour Phase 0)
export const VOLUME_LANDMARKS: Record<string, VolumeLandmark> = {
  chest:      { mev: 8,  mav: [12, 20], mrv: 22, label: 'PECTORAUX' },
  back:       { mev: 10, mav: [14, 22], mrv: 25, label: 'DOS' },
  shoulders:  { mev: 8,  mav: [16, 22], mrv: 26, label: 'ÉPAULES' },
  biceps:     { mev: 6,  mav: [14, 20], mrv: 26, label: 'BICEPS' },
  triceps:    { mev: 6,  mav: [10, 18], mrv: 22, label: 'TRICEPS' },
  quads:      { mev: 8,  mav: [12, 18], mrv: 20, label: 'QUADRICEPS' },
  hamstrings: { mev: 6,  mav: [10, 16], mrv: 20, label: 'ISCHIO-JAMB.' },
  calves:     { mev: 8,  mav: [12, 16], mrv: 20, label: 'MOLLETS' },
  glutes:     { mev: 0,  mav: [4, 12],  mrv: 16, label: 'FESSIERS' },
  abs:        { mev: 0,  mav: [16, 20], mrv: 25, label: 'ABDOS' },
};
