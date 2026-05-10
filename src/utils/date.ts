/** Returns YYYY-MM-DD string for a given date (or today). */
export const toDateString = (date: Date = new Date()): string =>
  date.toISOString().slice(0, 10);

/** Alias shorter form used throughout the codebase. */
export const ds = toDateString;
