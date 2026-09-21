import { describe, expect, it } from 'vitest';
import { jwtSecretSchema, resolveCorsOrigins } from './env.js';

describe('jwtSecretSchema', () => {
  it('allows a short default in development', () => {
    expect(jwtSecretSchema(false).parse(undefined)).toBe('change-me-dev-secret');
  });

  it('rejects a missing or short secret in production', () => {
    expect(() => jwtSecretSchema(true).parse(undefined)).toThrow();
    expect(() => jwtSecretSchema(true).parse('change-me-dev-secret')).toThrow();
  });

  it('accepts a long secret in production', () => {
    const secret = 'a'.repeat(32);
    expect(jwtSecretSchema(true).parse(secret)).toBe(secret);
  });
});

describe('resolveCorsOrigins', () => {
  it('allows localhost in development plus WEB_ORIGIN and CORS_ORIGINS', () => {
    const origins = resolveCorsOrigins({
      webOrigin: 'http://localhost:3000',
      extraOrigins: 'https://front.example.com',
      productionLike: false,
    });
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://127.0.0.1:3000');
    expect(origins).toContain('https://front.example.com');
  });

  it('does not allow *.vercel.app and strips localhost in production', () => {
    const origins = resolveCorsOrigins({
      webOrigin: 'https://app.example.com',
      extraOrigins: 'https://preview.example.com',
      productionLike: true,
    });
    expect(origins).toEqual(['https://app.example.com', 'https://preview.example.com']);
    expect(origins.some((origin) => origin.endsWith('.vercel.app'))).toBe(false);
  });

  it('drops a localhost WEB_ORIGIN default in production', () => {
    const origins = resolveCorsOrigins({
      webOrigin: 'http://localhost:3000',
      productionLike: true,
    });
    expect(origins).toEqual([]);
  });
});
