import { describe, expect, it } from 'vitest';
import { publicUrl } from './storage.js';

describe('publicUrl', () => {
  it('returns null for empty values', () => {
    expect(publicUrl(null)).toBeNull();
    expect(publicUrl(undefined)).toBeNull();
    expect(publicUrl('')).toBeNull();
  });

  it('keeps absolute urls', () => {
    expect(publicUrl('https://cdn.example/photos/a.jpg')).toBe('https://cdn.example/photos/a.jpg');
  });

  it('builds the public url from a relative path', () => {
    const url = publicUrl('photos/abc.jpg');
    expect(url).toContain('photos/abc.jpg');
    expect(url?.startsWith('http')).toBe(true);
  });
});
