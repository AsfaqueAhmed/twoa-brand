'use client';

import { Suspense } from 'react';
import Navbar from '@/features/catalog/presentation/Navbar';
import StudioPage from '@/features/customTee/presentation/studio/StudioPage';

export default function StudioRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans lg:h-screen lg:min-h-[704px]">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <Suspense fallback={<p className="px-4 py-24 text-center text-sm text-[#717171]">Loading studio…</p>}>
          <StudioPage />
        </Suspense>
      </main>
    </div>
  );
}
