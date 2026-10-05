import { describe, expect, it } from 'vitest';
import { parseSpotifyState } from './music.service.js';

// O caminho feliz (emitir, assinar e gastar o estado uma vez) precisa de banco e está em spotify.test.ts.
describe('spotify oauth state (parse)', () => {
  it('rejeita estado ausente, vazio ou que não é do formato', () => {
    expect(parseSpotifyState(undefined)).toBeNull();
    expect(parseSpotifyState('')).toBeNull();
    expect(parseSpotifyState('lixo')).toBeNull();
    expect(parseSpotifyState(Buffer.from('a.b.c').toString('base64url'))).toBeNull();
  });

  it('rejeita assinatura que não confere', () => {
    const forged = Buffer.from(`user-1.${Date.now() + 60_000}.nonce.${'0'.repeat(64)}`).toString('base64url');
    expect(parseSpotifyState(forged)).toBeNull();
  });

  it('rejeita estado expirado mesmo com a assinatura no lugar', () => {
    const expired = Buffer.from(`user-1.${Date.now() - 1}.nonce.${'0'.repeat(64)}`).toString('base64url');
    expect(parseSpotifyState(expired)).toBeNull();
  });
});
