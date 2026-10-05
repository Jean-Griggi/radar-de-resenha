import { describe, expect, it } from 'vitest';
import { parseSpotifyUrl, spotifyEmbedHeight, spotifyEmbedSrc } from './spotifyEmbed.js';

describe('parseSpotifyUrl', () => {
  it('lê faixa e playlist', () => {
    expect(parseSpotifyUrl('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toEqual({
      kind: 'track',
      id: '4uLU6hMCjMI75M1A2tKUQC',
    });
    expect(parseSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toEqual({
      kind: 'playlist',
      id: '37i9dQZF1DXcBWIGoYBM5M',
    });
  });

  it('aceita query string e o prefixo de idioma que o Spotify às vezes põe', () => {
    expect(parseSpotifyUrl('https://open.spotify.com/track/abc123?si=xyz')?.id).toBe('abc123');
    expect(parseSpotifyUrl('https://open.spotify.com/intl-pt/track/abc123')?.id).toBe('abc123');
  });

  it('recusa o que não é link de faixa ou playlist do Spotify', () => {
    for (const url of [
      null,
      undefined,
      '',
      'http://open.spotify.com/track/abc123',
      'https://open.spotify.com.evil.example/track/abc123',
      'https://evil.example/https://open.spotify.com/track/abc123',
      'https://open.spotify.com/album/abc123',
      'https://open.spotify.com/track/abc"onload="x',
      'javascript:alert(1)',
    ]) {
      expect(parseSpotifyUrl(url), String(url)).toBeNull();
    }
  });
});

describe('embed', () => {
  it('monta o src do iframe e a altura por tipo', () => {
    expect(spotifyEmbedSrc({ kind: 'track', id: 'abc123' })).toBe(
      'https://open.spotify.com/embed/track/abc123?utm_source=generator',
    );
    expect(spotifyEmbedHeight('track')).toBe(80);
    expect(spotifyEmbedHeight('playlist')).toBe(152);
  });
});
