import { Avatar } from './Avatar';

type Person = { src?: string | null; name?: string | null };

/**
 * Pilha de pessoas: sobreposição de 30%, contorno de 2 px na cor do fundo, no máximo `max` rostos
 * e um contador mono ("+7") para o resto. O grupo inteiro tem `aria-label`.
 */
export function AvatarStack({
  people,
  total,
  max = 5,
  size = 'sm',
  label,
}: {
  people: Person[];
  /** Total real de pessoas, quando `people` é só uma amostra. */
  total?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  label?: string;
}) {
  const count = total ?? people.length;
  const shown = people.slice(0, max);
  const rest = count - shown.length;

  return (
    <span className={`k-stack k-stack--${size}`} role="group" aria-label={label ?? `${count} pessoas`}>
      {shown.map((person, index) => (
        <span key={`${person.name ?? 'pessoa'}-${index}`} className="k-stack__item">
          <Avatar src={person.src} name={person.name} size={size} />
        </span>
      ))}
      {rest > 0 ? <span className="k-meta k-stack__more">+{rest}</span> : null}
    </span>
  );
}
