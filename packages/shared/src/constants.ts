export const APP_NAME = 'Resenhômetro';

export const ROLE_CATEGORIES = [
  'Festa',
  'Bar',
  'Restaurante',
  'Viagem',
  'Show',
  'Balada',
  'Cinema',
  'Encontro',
  'Faculdade',
  'Trabalho',
  'Esporte',
  'Outro',
] as const;

export const ATTENDANCE_STATUSES = ['going', 'maybe', 'not_going'] as const;

export const ROLE_STATUSES = ['upcoming', 'ongoing', 'past', 'cancelled'] as const;

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'rejected'] as const;

export const REACTION_TYPES = ['heart', 'laugh', 'cry', 'fire', 'eyes'] as const;

export const REACTION_EMOJI: Record<(typeof REACTION_TYPES)[number], string> = {
  heart: '❤️',
  laugh: '😂',
  cry: '😭',
  fire: '🔥',
  eyes: '👀',
};

export const REVIEW_RATING_CATEGORIES = [
  'fun',
  'music',
  'food',
  'ambiance',
  'company',
  'value',
] as const;

export const REVIEW_RATING_LABELS: Record<(typeof REVIEW_RATING_CATEGORIES)[number], string> = {
  fun: 'Diversão',
  music: 'Música',
  food: 'Comida',
  ambiance: 'Ambiente',
  company: 'Companhia',
  value: 'Custo-benefício',
};

export const COMMENT_TARGET_TYPES = ['role', 'review', 'post', 'photo', 'audio'] as const;

export const REACTION_TARGET_TYPES = ['role', 'review', 'post', 'comment', 'photo', 'audio'] as const;

export const FEED_EVENT_TYPES = [
  'role_created',
  'review_published',
  'attendance_going',
  'photo_added',
  'audio_added',
  'music_added',
  'achievement_unlocked',
  'post_created',
] as const;

export const NOTIFICATION_TYPES = [
  'comment',
  'reply',
  'reaction',
  'mention',
  'invite',
  'attendance',
  'friendship',
  'follow',
] as const;

export const MEDIA_KINDS = ['avatar', 'cover', 'photo', 'audio'] as const;

export const ACHIEVEMENT_DEFS = [
  { slug: 'first-role', name: 'Primeiro Rolê', description: 'Criou o primeiro rolê.' },
  { slug: 'roles-10', name: '10 Rolês', description: 'Criou 10 rolês.' },
  { slug: 'roles-25', name: '25 Rolês', description: 'Criou 25 rolês.' },
  { slug: 'roles-50', name: '50 Rolês', description: 'Criou 50 rolês.' },
  { slug: 'first-review', name: 'Primeira Resenha', description: 'Publicou a primeira resenha.' },
  { slug: 'reviews-10', name: '10 Resenhas', description: 'Publicou 10 resenhas.' },
  { slug: 'night-owl', name: 'Madrugadeiro', description: 'Confirmou presença em um rolê depois das 23h.' },
  { slug: 'explorer', name: 'Explorador', description: 'Visitou 5 lugares diferentes.' },
  { slug: 'bar-king', name: 'Rei do Bar', description: 'Criou 5 rolês na categoria Bar.' },
  { slug: 'role-of-the-year', name: 'Rolê do Ano', description: 'Recebeu a resenha mais bem avaliada do ano.' },
] as const;
