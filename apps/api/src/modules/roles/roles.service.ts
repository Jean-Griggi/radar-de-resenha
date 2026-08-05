import { randomUUID } from 'node:crypto';
import { roles } from '../../store/memory.js';
import type { CreateRoleInput } from './roles.schema.js';

export async function listRoles() {
  return [...roles].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createRole(userId: string, input: CreateRoleInput) {
  const role = {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    location: input.location,
    createdById: userId,
    createdAt: new Date(),
  };

  roles.push(role);

  return role;
}

export async function getRoleById(id: string) {
  return roles.find((role) => role.id === id);
}
