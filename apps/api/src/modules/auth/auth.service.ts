import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import { evaluateAchievements, getUserRow, mapUser, nowIso, uniqueUsername } from '../../lib/helpers.js';
import { conflict, notFound, unauthorized } from '../../lib/http.js';
import type { ChangePasswordInput } from './auth.types.js';
import type { LoginInput, RegisterInput, UpdateMeInput } from '../common.schema.js';

export async function registerUser(input: RegisterInput) {
  const existingEmail = await queryOne(`SELECT id FROM users WHERE email = $1`, [input.email.toLowerCase()]);
  if (existingEmail) throw conflict('E-mail já cadastrado');

  const username = input.username
    ? input.username.toLowerCase()
    : await uniqueUsername(input.name.split(' ')[0] || input.email);

  if (input.username) {
    const taken = await queryOne(`SELECT id FROM users WHERE username = $1`, [username]);
    if (taken) throw conflict('Username já está em uso');
  }

  const id = randomUUID();
  const stamp = nowIso();
  const passwordHash = await bcrypt.hash(input.password, 10);

  await exec(
    `INSERT INTO users (id, name, username, email, password_hash, is_public, show_followers, show_interactions, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,TRUE,TRUE,TRUE,$6,$7)`,
    [id, input.name.trim(), username, input.email.toLowerCase(), passwordHash, stamp, stamp],
  );

  const user = await getUserRow(id);
  return mapUser(user!, true);
}

export async function loginUser(input: LoginInput) {
  const user = await queryOne<{
    id: string;
    password_hash: string;
  }>(`SELECT id, password_hash FROM users WHERE email = $1`, [input.email.toLowerCase()]);

  if (!user) throw unauthorized('E-mail ou senha inválidos');

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) throw unauthorized('E-mail ou senha inválidos');

  const row = await getUserRow(user.id);
  return mapUser(row!, true);
}

export async function getMe(id: string) {
  const row = await getUserRow(id);
  if (!row) throw notFound('Usuário não encontrado');
  return mapUser(row, true);
}

export async function updateMe(id: string, input: UpdateMeInput) {
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!row) throw notFound('Usuário não encontrado');

  if (input.email && input.email.toLowerCase() !== row.email) {
    const taken = await queryOne(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [input.email.toLowerCase(), id]);
    if (taken) throw conflict('E-mail já cadastrado');
  }

  if (input.username && input.username.toLowerCase() !== row.username) {
    const taken = await queryOne(`SELECT id FROM users WHERE username = $1 AND id <> $2`, [
      input.username.toLowerCase(),
      id,
    ]);
    if (taken) throw conflict('Username já está em uso');
  }

  await exec(
    `UPDATE users SET
      name = $1, username = $2, email = $3, bio = $4, city = $5,
      is_public = $6, show_followers = $7, show_interactions = $8, updated_at = $9
     WHERE id = $10`,
    [
      input.name ?? row.name,
      (input.username ?? (row.username as string)).toLowerCase(),
      (input.email ?? (row.email as string)).toLowerCase(),
      input.bio === undefined ? row.bio : input.bio,
      input.city === undefined ? row.city : input.city,
      input.isPublic ?? row.is_public,
      input.showFollowers ?? row.show_followers,
      input.showInteractions ?? row.show_interactions,
      nowIso(),
      id,
    ],
  );

  return getMe(id);
}

export async function changePassword(id: string, input: ChangePasswordInput) {
  const user = await queryOne<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [id]);
  if (!user) throw notFound('Usuário não encontrado');
  const valid = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!valid) throw unauthorized('Senha atual inválida');
  const hash = await bcrypt.hash(input.newPassword, 10);
  await exec(`UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`, [hash, nowIso(), id]);
}

export async function setUserMedia(id: string, field: 'avatar' | 'cover', relative: string | null) {
  await exec(`UPDATE users SET ${field} = $1, updated_at = $2 WHERE id = $3`, [relative, nowIso(), id]);
  await evaluateAchievements(id);
  return getMe(id);
}

export async function listUsers(q?: string) {
  const rows = q
    ? await query(
        `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
         FROM users
         WHERE name ILIKE $1 OR username ILIKE $1 OR city ILIKE $1
         ORDER BY created_at DESC LIMIT 30`,
        [`%${q}%`],
      )
    : await query(
        `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT 30`,
      );
  return rows.map((row) => mapUser(row as never));
}
