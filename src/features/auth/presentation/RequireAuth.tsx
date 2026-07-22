'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Spinner from '@/shared/ui/Spinner';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
