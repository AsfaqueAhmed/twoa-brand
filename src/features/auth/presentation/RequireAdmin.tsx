'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Spinner from '@/shared/ui/Spinner';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isAdmin, router]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
