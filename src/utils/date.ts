/** Returns YYYY-MM-DD string for a given date (or today) in LOCAL timezone.
 *  Using local components (not .toISOString which is UTC) so that "today"
 *  matches the user's clock, not the UTC calendar. */
export const toDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Alias shorter form used throughout the codebase. */
export const ds = toDateString;
