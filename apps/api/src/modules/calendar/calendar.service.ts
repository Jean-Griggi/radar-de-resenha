import { query } from '../../db/client.js';
import { roleStatus, toDateKey } from '../../lib/helpers.js';

export async function getCalendar(userId: string, month?: string) {
  const rows = await query<{
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    status: string;
    category: string;
    location: string | null;
    att_status: string | null;
  }>(
    `SELECT r.id, r.title, r.date, r.time, r.status, r.category, r.location, a.status AS att_status
     FROM roles r
     LEFT JOIN attendances a ON a.role_id = r.id AND a.user_id = $1
     WHERE r.date IS NOT NULL
       AND (r.creator_id = $1 OR a.user_id = $1)
     ORDER BY r.date, r.time`,
    [userId],
  );

  const events = rows
    .map((row) => {
      const date = toDateKey(row.date);
      if (!date) return null;
      return {
        id: row.id,
        roleId: row.id,
        title: row.title,
        date,
        time: row.time,
        status: roleStatus(date, row.time, row.status),
        category: row.category,
        location: row.location,
        attendance: row.att_status,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  const filtered = month ? events.filter((event) => event.date.startsWith(month)) : events;
  const upcoming = events.filter((event) => event.status !== 'past').slice(0, 8);
  const past = events.filter((event) => event.status === 'past').slice(-8).reverse();

  return { events: filtered, upcoming, past };
}
