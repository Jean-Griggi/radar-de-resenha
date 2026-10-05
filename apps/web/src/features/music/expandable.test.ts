import { describe, expect, it } from 'vitest';
import { INITIAL_VISIBLE, splitVisible } from './expandable.js';

const list = (n: number) => Array.from({ length: n }, (_, index) => index + 1);

describe('splitVisible', () => {
  it('recolhida mostra só as 4 primeiras e conta quantas ficam escondidas', () => {
    expect(INITIAL_VISIBLE).toBe(4);
    expect(splitVisible(list(10), false)).toEqual({ visible: [1, 2, 3, 4], hidden: 6 });
  });

  it('expandida mostra todas', () => {
    expect(splitVisible(list(10), true).visible).toEqual(list(10));
  });

  it('com 4 ou menos não esconde nada (sem botão)', () => {
    expect(splitVisible(list(4), false)).toEqual({ visible: list(4), hidden: 0 });
    expect(splitVisible(list(2), false)).toEqual({ visible: list(2), hidden: 0 });
    expect(splitVisible([], false)).toEqual({ visible: [], hidden: 0 });
  });

  it('aceita outro limite inicial', () => {
    expect(splitVisible(list(5), false, 2)).toEqual({ visible: [1, 2], hidden: 3 });
  });
});
