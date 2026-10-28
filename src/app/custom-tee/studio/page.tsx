'use client';

import { Suspense } from 'react';
import Navbar from '@/features/catalog/presentation/Navbar';
import StudioPage from '@/features/customTee/presentation/studio/StudioPage';

export default function StudioRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-0">
        <Suspense fallback={<p className="px-4 py-24 text-center text-sm text-[#717171]">Loading studio…</p>}>
          <StudioPage />
        </Suspense>
      </main>
    </div>
  );
}
