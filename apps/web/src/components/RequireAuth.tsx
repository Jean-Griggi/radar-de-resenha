'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { AppShell } from './AppShell';
import { BrandLoader } from './BrandMark';

export function RequireAuth({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <BrandLoader label="Entrando no Redesinha" />;
  }

  return <AppShell right={right}>{children}</AppShell>;
}
