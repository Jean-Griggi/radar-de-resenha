import { describe, expect, it } from 'vitest';
import { CUIABA_VIEW, parsePlaces } from './geocode.js';

describe('parsePlaces', () => {
  it('lê coordenadas (que o Nominatim manda como texto) e monta um nome curto', () => {
    const [place] = parsePlaces([
      {
        lat: '-15.5961',
        lon: '-56.0967',
        name: 'Praça Alencastro',
        display_name: 'Praça Alencastro, Centro, Cuiabá, Mato Grosso, Brasil',
      },
    ]);
    expect(place).toEqual({
      label: 'Praça Alencastro, Centro, Cuiabá, Mato Grosso, Brasil',
      name: 'Praça Alencastro, Centro, Cuiabá',
      latitude: -15.5961,
      longitude: -56.0967,
    });
  });

  it('sem nome próprio usa as primeiras partes do endereço', () => {
    const [place] = parsePlaces([
      { lat: '-15.6', lon: '-56.1', name: '', display_name: 'Rua A, Bairro B, Cuiabá, Mato Grosso, Brasil' },
    ]);
    expect(place?.name).toBe('Rua A, Bairro B, Cuiabá');
  });

  it('descarta itens inválidos em vez de quebrar', () => {
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({})).toEqual([]);
    expect(
      parsePlaces([
        null,
        'texto',
        { lat: 'abc', lon: '-56', display_name: 'Sem lat' },
        { lat: '95', lon: '-56', display_name: 'Lat fora da faixa' },
        { lat: '-15', lon: '-56' },
        { lat: '-15', lon: '-56', display_name: 'Válido' },
      ]),
    ).toHaveLength(1);
  });

  it('o nome curto cabe no campo Local (160)', () => {
    const [place] = parsePlaces([{ lat: '1', lon: '1', name: 'x'.repeat(300), display_name: `${'x'.repeat(300)}, y` }]);
    expect(place!.name.length).toBeLessThanOrEqual(160);
  });
});

describe('CUIABA_VIEW', () => {
  it('abre em Cuiabá (longitude, latitude)', () => {
    expect(CUIABA_VIEW.center[0]).toBeCloseTo(-56.09, 1);
    expect(CUIABA_VIEW.center[1]).toBeCloseTo(-15.6, 1);
  });
});
