import { describe, it, expect } from 'vitest';
import { migrateScheduleTask } from '../../src/data/schemas/planning/scheduleTask';
import type { ScheduleTaskV1, ScheduleTaskV2, ScheduleTaskV3 } from '../../src/data/schemas/planning/scheduleTask';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeV1(overrides: Partial<ScheduleTaskV1> = {}): ScheduleTaskV1 {
  return {
    v: 1,
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Séance muscu',
    durationMin: 60,
    priority: 3,
    energyLevel: 'high',
    domain: 'sport',
    tags: [],
    dependsOn: [],
    enabled: true,
    ...overrides,
  };
}

function makeV2(overrides: Partial<ScheduleTaskV2> = {}): ScheduleTaskV2 {
  return {
    v: 2,
    id: '00000000-0000-0000-0000-000000000002',
    title: 'Prospection client',
    durationMin: 90,
    priority: 5,
    domain: 'general',
    tags: ['travail'],
    dependsOn: [],
    enabled: true,
    ...overrides,
  };
}

function makeV3(overrides: Partial<ScheduleTaskV3> = {}): ScheduleTaskV3 {
  return {
    v: 3,
    id: '00000000-0000-0000-0000-000000000003',
    title: 'Tâche actuelle',
    durationMin: 30,
    priority: 2,
    domain: 'general',
    tags: [],
    dependsOn: [],
    enabled: true,
    timeCategory: 'production',
    ...overrides,
  };
}

// ─── V1 → V4 ─────────────────────────────────────────────────────────────────

describe('ScheduleTask V1 → V4', () => {
  it('migrates to V4 and strips energyLevel', () => {
    const result = migrateScheduleTask(makeV1());
    expect(result.v).toBe(4);
    expect('energyLevel' in result).toBe(false);
  });

  it('sets timeCategory to null (unclassified)', () => {
    expect(migrateScheduleTask(makeV1()).timeCategory).toBeNull();
  });

  it('preserves core fields and maps enabled → status active', () => {
    const result = migrateScheduleTask(makeV1({ title: 'Deadlift', durationMin: 45 }));
    expect(result.title).toBe('Deadlift');
    expect(result.durationMin).toBe(45);
    expect(result.domain).toBe('sport');
    expect(result.status).toBe('active');
  });

  it('clamps priority into the 1-3 range', () => {
    expect(migrateScheduleTask(makeV1({ priority: 5 })).priority).toBe(3);
    expect(migrateScheduleTask(makeV1({ priority: 2 })).priority).toBe(2);
  });

  it('converts fixedStartMin → timeHHMM and preserves dependsOn', () => {
    const result = migrateScheduleTask(makeV1({ fixedStartMin: 360, dependsOn: ['task-a'] }));
    expect(result.timeHHMM).toBe('06:00');
    expect(result.dependsOn).toEqual(['task-a']);
  });
});

// ─── V2 → V4 ─────────────────────────────────────────────────────────────────

describe('ScheduleTask V2 → V4', () => {
  it('migrates to V4', () => {
    expect(migrateScheduleTask(makeV2()).v).toBe(4);
  });

  it('sets timeCategory to null', () => {
    expect(migrateScheduleTask(makeV2()).timeCategory).toBeNull();
  });

  it('preserves title/tags and clamps priority', () => {
    const result = migrateScheduleTask(makeV2({ title: 'Rapport mensuel', priority: 5, tags: ['travail', 'rapport'] }));
    expect(result.title).toBe('Rapport mensuel');
    expect(result.priority).toBe(3);
    expect(result.tags).toEqual(['travail', 'rapport']);
  });
});

// ─── V3 → V4 ─────────────────────────────────────────────────────────────────

describe('ScheduleTask V3 → V4', () => {
  it('preserves timeCategory=production', () => {
    const result = migrateScheduleTask(makeV3({ timeCategory: 'production' }));
    expect(result.v).toBe(4);
    expect(result.timeCategory).toBe('production');
  });

  it('preserves timeCategory=friction', () => {
    expect(migrateScheduleTask(makeV3({ timeCategory: 'friction' })).timeCategory).toBe('friction');
  });

  it('preserves timeCategory=null', () => {
    expect(migrateScheduleTask(makeV3({ timeCategory: null })).timeCategory).toBeNull();
  });

  it('converts fixedStartMin → timeHHMM and drops the removed window constraints', () => {
    const result = migrateScheduleTask(makeV3({ fixedStartMin: 480, notBeforeMin: 420, notAfterMin: 600 }));
    expect(result.timeHHMM).toBe('08:00');
    expect('notBeforeMin' in result).toBe(false);
    expect('notAfterMin' in result).toBe(false);
  });
});
