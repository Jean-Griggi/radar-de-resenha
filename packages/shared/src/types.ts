export type User = {
  id: string;
  name: string;
  email: string;
};

export type Role = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: Date;
};
