export const uuid = (): string => crypto.randomUUID();

/** Génère un id unique encodant la date : "{YYYY-MM-DD}.{ms}" */
export const dateId = (date: string): string => `${date}.${Date.now()}`;
