/** Quantos itens a lista mostra antes de pedir "Ver mais". */
export const INITIAL_VISIBLE = 4;

/**
 * Regra do "Ver mais": recolhida mostra só os primeiros `initial`; expandida mostra todos.
 * `hidden` é quantos ficam escondidos (0 = não precisa de botão).
 */
export function splitVisible<T>(items: T[], expanded: boolean, initial = INITIAL_VISIBLE) {
  const hidden = Math.max(0, items.length - initial);
  return { visible: expanded ? items : items.slice(0, initial), hidden };
}
