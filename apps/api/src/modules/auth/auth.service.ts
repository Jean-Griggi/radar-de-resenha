import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { users } from '../../store/memory.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export async function registerUser(input: RegisterInput) {
  const existing = users.find((user) => user.email === input.email);

  if (existing) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash,
    createdAt: new Date(),
  };

  users.push(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function loginUser(input: LoginInput) {
  const user = users.find((item) => item.email === input.email);

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
