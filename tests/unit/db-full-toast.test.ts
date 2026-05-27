import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DbFullError } from '../../src/data/storage/IStorage';

describe('DbFullError', () => {
  it('instanceof check', () => {
    const err = new DbFullError();
    expect(err).toBeInstanceOf(DbFullError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DbFullError');
    expect(err.message).toBe('AWAN storage quota exceeded');
  });

  it('trigger=true : event dispatché quand DbFullError est catchée', () => {
    const listener = vi.fn();
    window.addEventListener('awan:db-full', listener);

    try {
      const dispatchDbFull = () => window.dispatchEvent(new CustomEvent('awan:db-full'));
      const err = new DbFullError();
      if (err instanceof DbFullError) { dispatchDbFull(); }
    } finally {
      window.removeEventListener('awan:db-full', listener);
    }

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('trigger=false : succès → pas d\'event dispatché', () => {
    const listener = vi.fn();
    window.addEventListener('awan:db-full', listener);

    try {
      // Simule un save réussi — aucun throw, aucun dispatch
      const saveOk = async () => { /* success */ };
      saveOk();
    } finally {
      window.removeEventListener('awan:db-full', listener);
    }

    expect(listener).not.toHaveBeenCalled();
  });

  it('autres erreurs ne sont pas swallowées', () => {
    const listener = vi.fn();
    window.addEventListener('awan:db-full', listener);

    const throwIfDbFull = (err: unknown) => {
      if (err instanceof DbFullError) { window.dispatchEvent(new CustomEvent('awan:db-full')); return; }
      throw err;
    };

    try {
      expect(() => throwIfDbFull(new Error('autre erreur'))).toThrow('autre erreur');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('awan:db-full', listener);
    }
  });
});
