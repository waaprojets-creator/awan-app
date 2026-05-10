import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBStorage } from '../../src/data/storage/IndexedDBStorage';
import { z } from 'zod';

const PersonSchema = z.object({ name: z.string(), age: z.number() });
type Person = z.infer<typeof PersonSchema>;
const parsePerson = (raw: unknown): Person => PersonSchema.parse(raw);

describe('IndexedDBStorage', () => {
  let store: IndexedDBStorage;

  beforeEach(() => {
    store = new IndexedDBStorage();
  });

  it('get retourne null si clé absente', async () => {
    const result = await store.get('missing.key', parsePerson);
    expect(result).toBeNull();
  });

  it('set puis get retourne la valeur', async () => {
    await store.set('person.1', { name: 'Ali', age: 30 });
    const result = await store.get('person.1', parsePerson);
    expect(result?.name).toBe('Ali');
    expect(result?.age).toBe(30);
  });

  it('set écrase la valeur existante', async () => {
    await store.set('person.1', { name: 'Ali', age: 30 });
    await store.set('person.1', { name: 'Omar', age: 25 });
    const result = await store.get('person.1', parsePerson);
    expect(result?.name).toBe('Omar');
  });

  it('delete supprime la clé', async () => {
    await store.set('person.1', { name: 'Ali', age: 30 });
    await store.delete('person.1');
    const result = await store.get('person.1', parsePerson);
    expect(result).toBeNull();
  });

  it('delete sur clé inexistante ne lance pas d\'erreur', async () => {
    await expect(store.delete('nonexistent')).resolves.toBeUndefined();
  });

  it('list retourne les clés avec le préfixe', async () => {
    await store.set('person.1', { name: 'Ali', age: 30 });
    await store.set('person.2', { name: 'Omar', age: 25 });
    await store.set('other.1', { name: 'X', age: 1 });
    const keys = await store.list('person.');
    expect(keys).toHaveLength(2);
    expect(keys).toContain('person.1');
    expect(keys).toContain('person.2');
  });

  it('list retourne tableau vide si aucun préfixe correspondant', async () => {
    const keys = await store.list('nothing.');
    expect(keys).toHaveLength(0);
  });

  it('clear vide le store', async () => {
    await store.set('person.1', { name: 'Ali', age: 30 });
    await store.set('person.2', { name: 'Omar', age: 25 });
    await store.clear();
    const keys = await store.list('person.');
    expect(keys).toHaveLength(0);
  });

  it('transaction exécute correctement', async () => {
    await store.transaction(async tx => {
      await tx.set('person.tx1', { name: 'Youssef', age: 22 });
    });
    const result = await store.get('person.tx1', parsePerson);
    expect(result?.name).toBe('Youssef');
  });

  it('query filtre par préfixe + where', async () => {
    await store.set('person.1', { name: 'Ali', age: 30 });
    await store.set('person.2', { name: 'Omar', age: 30 });
    await store.set('person.3', { name: 'Khalid', age: 25 });
    const results = await store.query('person.', { age: 30 }, parsePerson);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.name).sort()).toEqual(['Ali', 'Omar']);
  });

  it('plusieurs instances indépendantes partagent les données', async () => {
    const store2 = new IndexedDBStorage();
    await store.set('shared.key', { name: 'Shared', age: 0 });
    const result = await store2.get('shared.key', parsePerson);
    expect(result?.name).toBe('Shared');
  });
});
