// Legacy shim — à supprimer lors de la réécriture des écrans
export { toDateString as ds, toDateString } from './date';
export { uuid as uid, uuid } from './id';
export const parseDate = (s: string) => new Date(s);
