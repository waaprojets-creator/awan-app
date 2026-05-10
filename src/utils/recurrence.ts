// Legacy shim — à remplacer par modules/planning/scheduler
export const eventsForDate = (_db: unknown, _date: string): Array<Record<string, unknown>> => [];
export const daysWithEvents = (_db: unknown, _yr?: number, _mo?: number): Set<number> => new Set<number>();
