import type { AuthUser, PublicUser } from '@resenhometro/shared';
import { query, queryOne } from '../../db/client.js';
import { sqlPlaceholders } from '../../lib/helpers.js';
import { publicUrl } from '../../lib/storage.js';

export type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  cover: string | null;
  bio: string | null;
  city: string | null;
  is_public: boolean;
  show_followers: boolean;
  show_interactions: boolean;
  created_at: string;
  updated_at: string;
};

export function mapUser(row: UserRow, withEmail: true): AuthUser;
export function mapUser(row: UserRow, withEmail?: boolean): PublicUser;
export function mapUser(row: UserRow, withEmail = false): PublicUser | AuthUser {
  const user: PublicUser = {
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: publicUrl(row.avatar),
    cover: publicUrl(row.cover),
    bio: row.bio,
    city: row.city,
    isPublic: Boolean(row.is_public),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
  if (withEmail) {
    return { ...user, email: row.email };
  }
  return user;
}

export async function getUserRow(id: string) {
  return queryOne<UserRow>(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE id = $1`,
    [id],
  );
}

export async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return [] as UserRow[];
  return query<UserRow>(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE id IN (${sqlPlaceholders(ids.length)})`,
    ids,
  );
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
}

export async function uniqueUsername(from: string) {
  const base = slugify(from) || 'user';
  let candidate = base;
  let i = 0;
  while (await queryOne(`SELECT id FROM users WHERE username = $1`, [candidate])) {
    i += 1;
    candidate = `${base}${i}`;
  }
  return candidate;
}
