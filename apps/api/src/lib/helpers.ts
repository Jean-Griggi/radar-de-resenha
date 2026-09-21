export const APP_TIMEZONE = 'America/Sao_Paulo';

/** Instant do rolê no banco (date + time em Brasília). Sem hora válida → 23:59. */
export const ROLE_START_AT_SQL = `((date::timestamp + COALESCE(
  CASE WHEN time ~ '^[0-9]{1,2}:[0-9]{2}' THEN BTRIM(time)::time ELSE NULL END,
  TIME '23:59'
)) AT TIME ZONE '${APP_TIMEZONE}')`;

export function nowIso() {
  return new Date().toISOString();
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function utcDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

/**
 * DATE do postgres.js vira Date em UTC midnight — getters locais no Brasil
 * atrasam um dia. PGlite às vezes manda Date; String(date).slice(0, 10) vira "Wed Aug 19".
 */
export function toDateKey(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return utcDateKey(value);
  }
  const text = String(value);
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso?.[1]) return iso[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return utcDateKey(parsed);
}

/** UTC em que o relógio em `timeZone` marca `dateKey` + `time` (HH:mm). */
export function zonedLocalToUtc(dateKey: string, time: string | null, timeZone = APP_TIMEZONE): Date | null {
  const dateMatch = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  let hour = 23;
  let minute = 59;
  if (time) {
    const timeMatch = String(time).match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    if (hour > 23 || minute > 59) return null;
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMs = (instant: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - instant;
  };

  const adjusted = utcGuess - offsetMs(utcGuess);
  return new Date(utcGuess - offsetMs(adjusted));
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value as T;
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function sqlPlaceholders(count: number, start = 1) {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(',');
}

export function roleStatus(date: string | null, time: string | null, current = 'upcoming', now = Date.now()) {
  if (current === 'cancelled') return 'cancelled';
  if (!date) return 'upcoming';
  const stamp = zonedLocalToUtc(date, time);
  if (!stamp) return 'upcoming';
  const t = stamp.getTime();
  if (t < now - 4 * 60 * 60 * 1000) return 'past';
  if (t <= now + 2 * 60 * 60 * 1000 && t >= now - 2 * 60 * 60 * 1000) return 'ongoing';
  if (t < now) return 'past';
  return 'upcoming';
}
