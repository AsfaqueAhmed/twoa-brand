'use client';

import { Suspense } from 'react';
import MobileStudioPage from '@/features/customTee/presentation/mobile/MobileStudioPage';

export default function MobileStudioRoute() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center">
            <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading mobile studio…</p>
          </div>
        }
      >
        <MobileStudioPage />
      </Suspense>
    </div>
  );
}
