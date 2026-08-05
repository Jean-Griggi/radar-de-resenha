export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type StoredRole = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  createdById: string;
  createdAt: Date;
};

export const users: StoredUser[] = [];
export const roles: StoredRole[] = [];
