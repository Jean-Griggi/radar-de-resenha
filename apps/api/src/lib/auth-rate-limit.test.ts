import { describe, expect, it } from 'vitest';
import { HttpError } from './http.js';
import { consumeKeyedLimit } from './auth-rate-limit.js';

describe('consumeKeyedLimit', () => {
  it('throws 429 after max hits on the same key', () => {
    const key = `test-${Date.now()}`;
    consumeKeyedLimit(key, 2, 60_000);
    consumeKeyedLimit(key, 2, 60_000);
    try {
      consumeKeyedLimit(key, 2, 60_000);
      throw new Error('expected 429');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(429);
    }
  });
});
