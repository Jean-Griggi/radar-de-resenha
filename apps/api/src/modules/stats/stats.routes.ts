import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { getCalendar } from '../calendar/calendar.service.js';
import { getStats, getYearReview } from './stats.service.js';

export async function statsRoutes(app: FastifyInstance) {
  app.get('/calendar', { preHandler: [authenticate] }, async (request) => {
    const { month } = request.query as { month?: string };
    return getCalendar(request.user.sub, month);
  });

  app.get('/stats', { preHandler: [authenticate] }, async (request) => getStats(request.user.sub));
  app.get('/year-review', { preHandler: [authenticate] }, async (request) => {
    const { year } = request.query as { year?: string };
    return getYearReview(request.user.sub, year ? Number(year) : undefined);
  });
}
