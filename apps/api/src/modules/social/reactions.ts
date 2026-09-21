import { query } from '../../db/client.js';

const REACTION_TYPES = ['heart', 'laugh', 'cry', 'fire', 'eyes'] as const;

export type ReactionSummaryItem = { type: (typeof REACTION_TYPES)[number]; count: number; reacted: boolean };

function emptyReactionSummary(): ReactionSummaryItem[] {
  return REACTION_TYPES.map((type) => ({ type, count: 0, reacted: false }));
}

function reactionKey(targetType: string, targetId: string) {
  return `${targetType}:${targetId}`;
}

export async function getReactionSummaries(
  targets: { targetType: string; targetId: string }[],
  userId?: string,
) {
  const map = new Map<string, ReactionSummaryItem[]>();
  const unique: { targetType: string; targetId: string }[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    if (!target.targetType || !target.targetId) continue;
    const key = reactionKey(target.targetType, target.targetId);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(target);
    map.set(key, emptyReactionSummary());
  }

  if (unique.length === 0) return map;

  const tupleSql = unique.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
  const tupleParams = unique.flatMap((target) => [target.targetType, target.targetId]);

  const rows = await query<{ target_type: string; target_id: string; type: string; count: string }>(
    `SELECT target_type, target_id, type, COUNT(*)::text AS count
     FROM reactions
     WHERE (target_type, target_id) IN (${tupleSql})
     GROUP BY target_type, target_id, type`,
    tupleParams,
  );

  for (const row of rows) {
    const summary = map.get(reactionKey(row.target_type, row.target_id));
    const slot = summary?.find((item) => item.type === row.type);
    if (slot) slot.count = Number(row.count);
  }

  if (userId) {
    const mineSql = unique.map((_, i) => `($${i * 2 + 2}, $${i * 2 + 3})`).join(',');
    const mine = await query<{ target_type: string; target_id: string; type: string }>(
      `SELECT target_type, target_id, type FROM reactions
       WHERE user_id = $1 AND (target_type, target_id) IN (${mineSql})`,
      [userId, ...tupleParams],
    );
    for (const row of mine) {
      const summary = map.get(reactionKey(row.target_type, row.target_id));
      if (!summary) continue;
      for (const slot of summary) slot.reacted = slot.type === row.type;
    }
  }

  return map;
}

export async function getReactionSummary(targetType: string, targetId: string, userId?: string) {
  const map = await getReactionSummaries([{ targetType, targetId }], userId);
  return map.get(reactionKey(targetType, targetId)) ?? emptyReactionSummary();
}
