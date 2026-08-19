import { ACHIEVEMENT_DEFS } from '@resenhometro/shared';
import { query, queryOne } from '../../db/client.js';
import { getUserRow, mapUser, parseJson, toDateKey } from '../../lib/helpers.js';
import { serializeRole } from '../roles/roles.service.js';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export async function getStats(userId: string) {
  const roles = await query<{
    id: string;
    date: string | null;
    time: string | null;
    category: string;
    location: string | null;
    created_at: string;
  }>(
    `SELECT id, date, time, category, location, created_at FROM roles
     WHERE creator_id = $1 OR id IN (SELECT role_id FROM attendances WHERE user_id = $1 AND status = 'going')`,
    [userId],
  );
  const reviews = await query<{ rating: number; ratings: string }>(`SELECT rating, ratings FROM reviews WHERE author_id = $1`, [
    userId,
  ]);
  const friends = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR receiver_id = $1)`,
    [userId],
  );
  const people = await query<{ user_id: string; count: string }>(
    `SELECT a.user_id, COUNT(*)::text AS count
     FROM attendances a
     WHERE a.status = 'going'
       AND a.user_id <> $1
       AND a.role_id IN (SELECT role_id FROM attendances WHERE user_id = $1 AND status = 'going')
     GROUP BY a.user_id
     ORDER BY COUNT(*) DESC
     LIMIT 6`,
    [userId],
  );
  const tracks = await query<{ title: string; artist: string; count: string }>(
    `SELECT title, artist, COUNT(*)::text AS count FROM music
     WHERE role_id IN (SELECT id FROM roles WHERE creator_id = $1)
     GROUP BY title, artist
     ORDER BY COUNT(*) DESC LIMIT 6`,
    [userId],
  );

  const monthMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const weekdayMap = new Map<string, number>();
  const hourMap = new Map<string, number>();
  const placeMap = new Map<string, number>();

  for (const role of roles) {
    const dateKey = toDateKey(role.date);
    const date = dateKey ? new Date(`${dateKey}T12:00:00`) : new Date(role.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
    categoryMap.set(role.category, (categoryMap.get(role.category) ?? 0) + 1);
    const weekday = WEEKDAYS[date.getDay()] ?? 'Domingo';
    weekdayMap.set(weekday, (weekdayMap.get(weekday) ?? 0) + 1);
    if (role.time) {
      const hour = role.time.slice(0, 2);
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }
    if (role.location) placeMap.set(role.location, (placeMap.get(role.location) ?? 0) + 1);
  }

  const ratingCats: Record<string, number[]> = {};
  for (const review of reviews) {
    const detail = parseJson<Record<string, number>>(review.ratings, {});
    for (const [key, value] of Object.entries(detail)) {
      const list = ratingCats[key] ?? [];
      list.push(value);
      ratingCats[key] = list;
    }
  }

  const topPeople = [];
  for (const person of people) {
    const user = await getUserRow(person.user_id);
    if (user) topPeople.push({ user: mapUser(user), count: Number(person.count) });
  }

  return {
    totalRoles: roles.length,
    totalReviews: reviews.length,
    participations: roles.length,
    friends: Number(friends?.count ?? 0),
    placesVisited: placeMap.size,
    rolesByMonth: [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
    rolesByCategory: [...categoryMap.entries()].map(([category, count]) => ({ category, count })),
    rolesByWeekday: WEEKDAYS.map((weekday) => ({ weekday, count: weekdayMap.get(weekday) ?? 0 })),
    hourDistribution: [...hourMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count })),
    ratingsAverage:
      reviews.length === 0 ? null : Math.round((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length) * 10) / 10,
    ratingsByCategory: Object.fromEntries(
      Object.entries(ratingCats).map(([key, values]) => [
        key,
        Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
      ]),
    ),
    topPlaces: [...placeMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    topPeople,
    topArtists: Object.values(
      tracks.reduce<Record<string, { name: string; count: number }>>((acc, track) => {
        const current = acc[track.artist] ?? { name: track.artist, count: 0 };
        current.count += Number(track.count);
        acc[track.artist] = current;
        return acc;
      }, {}),
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    topTracks: tracks.map((track) => ({ title: track.title, artist: track.artist, count: Number(track.count) })),
  };
}

export async function getYearReview(userId: string, year = new Date().getFullYear()) {
  const stats = await getStats(userId);
  const roles = await query(
    `SELECT * FROM roles WHERE creator_id = $1 AND EXTRACT(YEAR FROM COALESCE(date, created_at::date)) = $2 ORDER BY created_at DESC LIMIT 6`,
    [userId, year],
  );
  const busiest = [...stats.rolesByMonth].sort((a, b) => b.count - a.count)[0];
  const monthIndex = busiest ? Number(busiest.month.split('-')[1]) - 1 : -1;

  return {
    year,
    totalRoles: stats.totalRoles,
    places: stats.placesVisited,
    people: stats.topPeople.length,
    reviews: stats.totalReviews,
    busiestMonth: monthIndex >= 0 ? MONTHS[monthIndex] : null,
    favoriteGenre: stats.topArtists[0]?.name ?? null,
    topTrack: stats.topTracks[0] ? { title: stats.topTracks[0].title, artist: stats.topTracks[0].artist } : null,
    topPartner: stats.topPeople[0]?.user ?? null,
    topCategory: [...stats.rolesByCategory].sort((a, b) => b.count - a.count)[0]?.category ?? null,
    highlights: await Promise.all(roles.map((row) => serializeRole(row as never, userId))),
    achievements: ACHIEVEMENT_DEFS,
  };
}
