'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearAuth, getUser, setUser, type AuthUser } from '@/lib/auth';
import { AppShell } from './AppShell';
import { BrandLoader } from './BrandMark';

export function RequireAuth({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function confirmSession() {
      if (getUser()) {
        setReady(true);
        return;
      }

      try {
        const { data } = await api.get<AuthUser>('/auth/me');
        if (cancelled) return;
        setUser(data);
        setReady(true);
      } catch {
        if (cancelled) return;
        clearAuth();
        router.replace('/login');
      }
    }

    void confirmSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return <BrandLoader label="Entrando no Redesinha" />;
  }

  return <AppShell right={right}>{children}</AppShell>;
}
