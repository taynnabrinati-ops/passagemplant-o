/**
 * Date helpers. A plain `YYYY-MM-DD` is parsed as a local date so that day
 * counters never drift by one when the browser sits west of UTC.
 */
export function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

/** Day counter used for "D3 de CTI": the admission day itself is D1. */
export function daysSince(from: string | Date, to?: string | Date): number {
  const start = parseDate(from);
  const end = to ? parseDate(to) : new Date();
  const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

export function ageFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = parseDate(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  return parseDate(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Today in the unit's timezone, as `YYYY-MM-DD`. */
export function todayInSaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Day label for a therapy. Antibiotics started on a given day are counted from
 * the following day unless the schedule is once-daily, matching the ward's
 * convention for "D3 de meropenem".
 */
export function therapyDayNumber(
  kind: string,
  startDate: string | Date,
  endDate?: string | Date,
  isOncePerDay = false,
): number {
  const day = daysSince(startDate, endDate);
  if (kind === "Antibiótico" && !isOncePerDay) return Math.max(0, day - 1);
  return day;
}

export function therapyDayLabel(
  kind: string,
  startDate: string | Date,
  endDate?: string | Date,
  isOncePerDay = false,
): string {
  return `D${therapyDayNumber(kind, startDate, endDate, isOncePerDay)}`;
}

export const ONCE_PER_DAY_TAG = "[1x/dia]";

export function isOncePerDay(note?: string | null): boolean {
  return !!note && note.includes(ONCE_PER_DAY_TAG);
}
