function parseDay(value?: string | null) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T12:00:00`) : new Date(value);
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

export function initials(name?: string | null) {
  if (!name) return 'R';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatMoney(value?: number | null) {
  if (value == null) return null;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
