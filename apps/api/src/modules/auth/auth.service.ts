import type { AuthUser } from '@resenhometro/shared';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env, isProductionLike } from '../../config/env.js';
import { exec, query, queryOne } from '../../db/client.js';
import { nowIso } from '../../lib/helpers.js';
import { getUserRow, mapUser, uniqueUsername } from '../users/users.map.js';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/http.js';
import { passwordResetEmail, sendMail } from '../../lib/mail.js';
import type { ChangePasswordInput } from './auth.types.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
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

export async function loginUser(input: LoginInput): Promise<AuthUser> {
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

export async function getMe(id: string): Promise<AuthUser> {
  const row = await getUserRow(id);
  if (!row) throw notFound('Usuário não encontrado');
  return mapUser(row, true);
}

export async function changePassword(id: string, input: ChangePasswordInput) {
  const user = await queryOne<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [id]);
  if (!user) throw notFound('Usuário não encontrado');
  const valid = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!valid) throw unauthorized('Senha atual inválida');
  const hash = await bcrypt.hash(input.newPassword, 10);
  await exec(`UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`, [hash, nowIso(), id]);
}

const RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string) {
  const generic = {
    ok: true as const,
    message: 'Se o e-mail existir, enviamos um link para redefinir a senha.',
  };

  const user = await queryOne<{ id: string; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  if (!user) return generic;

  await exec(`DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL`, [user.id]);

  const token = randomBytes(32).toString('hex');
  const stamp = nowIso();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
  await exec(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [randomUUID(), user.id, hashResetToken(token), expiresAt, stamp],
  );

  // O link cru só existe aqui: vai no e-mail e em mais nenhum lugar (nem resposta, nem tela).
  const resetUrl = `${env.WEB_ORIGIN}/redefinir-senha?token=${token}`;
  let emailSent = false;
  try {
    emailSent = await sendMail(user.email, 'Redefinir senha — Resenhômetro', passwordResetEmail(user.name, resetUrl));
  } catch (error) {
    console.error('Falha ao enviar e-mail de redefinição:', error instanceof Error ? error.message : 'erro desconhecido');
  }

  // Só em dev local, para quem não configurou SMTP conseguir testar. Em produção o log nunca carrega o token.
  if (!emailSent && !isProductionLike()) {
    console.info(`[dev] Link de redefinição (SMTP não configurado ou falhou): ${resetUrl}`);
  }

  return generic;
}

export async function resetPassword(token: string, password: string) {
  const stamp = nowIso();
  // Consome o token numa só instrução: dois usos simultâneos do mesmo link não passam os dois.
  const used = await queryOne<{ user_id: string }>(
    `UPDATE password_resets SET used_at = $1
     WHERE token_hash = $2 AND used_at IS NULL AND expires_at > $1
     RETURNING user_id`,
    [stamp, hashResetToken(token)],
  );
  if (!used) throw badRequest('Link inválido ou expirado. Peça outro e-mail.');

  const hash = await bcrypt.hash(password, 10);
  // password_changed_at derruba qualquer sessão emitida antes desta troca (ver lib/authenticate.ts).
  await exec(
    `UPDATE users SET password_hash = $1, password_changed_at = $2, updated_at = $2 WHERE id = $3`,
    [hash, stamp, used.user_id],
  );
  await exec(`DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL`, [used.user_id]);
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
