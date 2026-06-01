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

// ─── V1 → V3 ─────────────────────────────────────────────────────────────────

describe('ScheduleTask V1 → V3', () => {
  it('migrates to V3 and strips energyLevel', () => {
    const raw = makeV1();
    const result = migrateScheduleTask(raw);
    expect(result.v).toBe(3);
    expect('energyLevel' in result).toBe(false);
  });

  it('sets timeCategory to null (unclassified)', () => {
    const result = migrateScheduleTask(makeV1());
    expect(result.timeCategory).toBeNull();
  });

  it('preserves core fields', () => {
    const raw = makeV1({ title: 'Deadlift', durationMin: 45, priority: 4 });
    const result = migrateScheduleTask(raw);
    expect(result.title).toBe('Deadlift');
    expect(result.durationMin).toBe(45);
    expect(result.priority).toBe(4);
    expect(result.domain).toBe('sport');
    expect(result.enabled).toBe(true);
  });

  it('preserves optional fields (fixedStartMin, dependsOn)', () => {
    const raw = makeV1({ fixedStartMin: 360, dependsOn: ['task-a'] });
    const result = migrateScheduleTask(raw);
    expect(result.fixedStartMin).toBe(360);
    expect(result.dependsOn).toEqual(['task-a']);
  });
});

// ─── V2 → V3 ─────────────────────────────────────────────────────────────────

describe('ScheduleTask V2 → V3', () => {
  it('migrates to V3', () => {
    const result = migrateScheduleTask(makeV2());
    expect(result.v).toBe(3);
  });

  it('sets timeCategory to null', () => {
    expect(migrateScheduleTask(makeV2()).timeCategory).toBeNull();
  });

  it('preserves all V2 fields', () => {
    const raw = makeV2({ title: 'Rapport mensuel', priority: 5, tags: ['travail', 'rapport'] });
    const result = migrateScheduleTask(raw);
    expect(result.title).toBe('Rapport mensuel');
    expect(result.priority).toBe(5);
    expect(result.tags).toEqual(['travail', 'rapport']);
  });
});

// ─── V3 idempotence ───────────────────────────────────────────────────────────

describe('ScheduleTask V3 idempotence', () => {
  it('V3 with timeCategory=production is unchanged', () => {
    const raw = makeV3({ timeCategory: 'production' });
    const result = migrateScheduleTask(raw);
    expect(result.v).toBe(3);
    expect(result.timeCategory).toBe('production');
  });

  it('V3 with timeCategory=friction is unchanged', () => {
    const raw = makeV3({ timeCategory: 'friction' });
    const result = migrateScheduleTask(raw);
    expect(result.timeCategory).toBe('friction');
  });

  it('V3 with timeCategory=null is unchanged', () => {
    const raw = makeV3({ timeCategory: null });
    const result = migrateScheduleTask(raw);
    expect(result.timeCategory).toBeNull();
  });

  it('V3 preserves all optional constraints', () => {
    const raw = makeV3({ fixedStartMin: 480, notBeforeMin: 420, notAfterMin: 600 });
    const result = migrateScheduleTask(raw);
    expect(result.fixedStartMin).toBe(480);
    expect(result.notBeforeMin).toBe(420);
    expect(result.notAfterMin).toBe(600);
  });
});
