'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getUser } from '@/lib/auth';

export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    router.replace(user?.username ? `/perfil/${user.username}` : '/login');
  }, [router]);
  return <p className="p-8 text-muted">Abrindo perfil...</p>;
}
