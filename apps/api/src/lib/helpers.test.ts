import { describe, expect, it } from 'vitest';
import { roleStatus, toDateKey, zonedLocalToUtc } from './helpers.js';

describe('toDateKey', () => {
  it('keeps YYYY-MM-DD strings', () => {
    expect(toDateKey('2026-08-25')).toBe('2026-08-25');
    expect(toDateKey('2026-08-25T00:00:00.000Z')).toBe('2026-08-25');
  });

  it('reads postgres DATE (UTC midnight) without shifting the day', () => {
    expect(toDateKey(new Date('2026-08-25T00:00:00.000Z'))).toBe('2026-08-25');
  });

  it('returns null for empty values', () => {
    expect(toDateKey(null)).toBeNull();
    expect(toDateKey('')).toBeNull();
  });
});

describe('zonedLocalToUtc', () => {
  it('treats wall clock as America/Sao_Paulo (UTC-3, sem DST)', () => {
    const stamp = zonedLocalToUtc('2026-08-25', '22:00');
    expect(stamp?.toISOString()).toBe('2026-08-26T01:00:00.000Z');
  });

  it('defaults missing time to 23:59 in Sao Paulo', () => {
    const stamp = zonedLocalToUtc('2026-08-25', null);
    expect(stamp?.toISOString()).toBe('2026-08-26T02:59:00.000Z');
  });
});

describe('roleStatus', () => {
  const twentyTwoSp = Date.parse('2026-08-26T01:00:00.000Z');

  it('keeps a 22:00 Brasília role upcoming before the start', () => {
    const now = twentyTwoSp - 3 * 60 * 60 * 1000;
    expect(roleStatus('2026-08-25', '22:00', 'upcoming', now)).toBe('upcoming');
  });

  it('does not mark 22:00 Brasília as past at 21:30 local (would be past if parsed as UTC)', () => {
    const twentyOneThirtySp = Date.parse('2026-08-26T00:30:00.000Z');
    expect(roleStatus('2026-08-25', '22:00', 'upcoming', twentyOneThirtySp)).toBe('ongoing');
  });

  it('marks past after the 2h window', () => {
    const now = twentyTwoSp + 3 * 60 * 60 * 1000;
    expect(roleStatus('2026-08-25', '22:00', 'upcoming', now)).toBe('past');
  });

  it('keeps cancelled', () => {
    expect(roleStatus('2026-08-25', '22:00', 'cancelled')).toBe('cancelled');
  });
});
