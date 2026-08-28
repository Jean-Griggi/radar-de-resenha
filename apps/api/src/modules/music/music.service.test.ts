import { describe, expect, it } from 'vitest';
import { createSpotifyState, parseSpotifyState } from './music.service.js';

describe('spotify oauth state', () => {
  it('round-trips a user id without an in-memory Map', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const state = createSpotifyState(userId);
    expect(parseSpotifyState(state)).toBe(userId);
  });

  it('rejects tampered state', () => {
    const state = createSpotifyState('user-1');
    expect(parseSpotifyState(`${state}x`)).toBeNull();
    expect(parseSpotifyState(undefined)).toBeNull();
  });
});
