function parseDay(value?: string | null) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(`${value.slice(0, 10)}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | null) {
  const date = parseDay(value);
  if (!date) return value ? value : 'Data a combinar';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function formatShortDate(value?: string | null) {
  const date = parseDay(value);
  if (!date) return value ?? '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString('pt-BR');
}

/**
 * Hora curta de uma conversa: hoje "18:30", ontem "Ontem", nos últimos 6 dias o dia da semana ("Seg"),
 * antes disso a data ("12 out"). O CSS (`.k-meta`) põe em caixa alta.
 */
export function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ontem';
  if (days < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function initials(name?: string | null) {
  if (!name) return 'R';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** Concordância simples: plural(1, 'pessoa', 'pessoas') → "1 pessoa"; plural(3, …) → "3 pessoas". */
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatMoney(value?: number | null) {
  if (value == null) return null;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Dia, dia da semana e a linha curta do convite de rolê ("out · 20h"), mais "em N dias" quando for futuro. */
export function inviteWhen(date?: string | null, time?: string | null) {
  const day = parseDay(date);
  if (!day) return null;
  const weekday = day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const month = day.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const match = time ? /^(d{1,2}):(d{2})/.exec(time) : null;
  const hour = match ? ` · ${Number(match[1])}h${match[2] === '00' ? '' : match[2]}` : '';
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(day) - startOfDay(new Date())) / 86_400_000);
  const countdown = days > 1 ? `em ${days} dias` : days === 1 ? 'em 1 dia' : days === 0 ? 'hoje' : null;
  return { day: String(day.getDate()).padStart(2, '0'), weekday, line: `${month}${hour}`, countdown };
}

/** Data de hoje no cabeçalho do feed ("qui 15 out"); a caixa alta vem do `.k-meta`. */
export function formatToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value.replace('.', '') ?? '';
  return `${pick('weekday')} ${pick('day')} ${pick('month')}`;
}

/**
 * Data e hora no formato mono da Kina: "sáb 18 out · 18h" (a caixa alta vem do `.k-meta`).
 * Sem data válida devolve o texto original; sem hora, só a data.
 */
export function formatMeta(date?: string | null, time?: string | null) {
  const day = parseDay(date);
  if (!day) return date ?? 'Data a combinar';
  const weekday = day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const month = day.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const base = `${weekday} ${String(day.getDate()).padStart(2, '0')} ${month}`;
  const match = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
  if (!match) return base;
  const hour = Number(match[1]);
  return `${base} · ${hour}h${match[2] === '00' ? '' : match[2]}`;
}
