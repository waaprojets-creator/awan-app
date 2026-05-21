import { describe, it, expect } from 'vitest';
import {
  loadKnowledge,
  getKnowledgeById,
  getKnowledgeByDomain,
} from '../../src/modules/coach/knowledgeLoader';

describe('loadKnowledge', () => {
  it('returns at least 15 entries', () => {
    const entries = loadKnowledge();
    expect(entries.length).toBeGreaterThanOrEqual(15);
  });

  it('caches result: second call returns same array reference', () => {
    const first = loadKnowledge();
    const second = loadKnowledge();
    expect(first).toBe(second);
  });

  it('each entry has v:1, id, domain, and references array with year', () => {
    const entries = loadKnowledge();
    for (const entry of entries) {
      expect(entry.v).toBe(1);
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.domain).toBe('string');
      expect(Array.isArray(entry.references)).toBe(true);
      expect(entry.references.length).toBeGreaterThanOrEqual(1);
      for (const ref of entry.references) {
        expect(typeof ref.year).toBe('number');
        expect(ref.year).toBeGreaterThanOrEqual(1900);
        expect(ref.year).toBeLessThanOrEqual(2100);
      }
    }
  });
});

describe('getKnowledgeById', () => {
  it('returns defined for sport.volume.hypertrophy', () => {
    const entry = getKnowledgeById('sport.volume.hypertrophy');
    expect(entry).toBeDefined();
  });

  it('returns undefined for unknown id', () => {
    const entry = getKnowledgeById('does.not.exist');
    expect(entry).toBeUndefined();
  });
});

describe('getKnowledgeByDomain', () => {
  it('returns ≥8 entries for domain sport', () => {
    const entries = getKnowledgeByDomain('sport');
    expect(entries.length).toBeGreaterThanOrEqual(8);
  });

  it('returns only entries matching the requested domain', () => {
    const entries = getKnowledgeByDomain('nutrition');
    for (const entry of entries) {
      expect(entry.domain).toBe('nutrition');
    }
  });

  it('returns at least 1 entry for anthropo domain', () => {
    const entries = getKnowledgeByDomain('anthropo');
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });
});
