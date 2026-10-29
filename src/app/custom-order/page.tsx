'use client';

import { Suspense } from 'react';
import Navbar from '@/features/catalog/presentation/Navbar';
import CustomOrderPage from '@/features/customTee/presentation/CustomOrderPage';

export default function CustomOrderRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <Suspense fallback={<p className="px-4 py-16 text-center text-sm text-[#717171]">Loading your quote...</p>}>
          <CustomOrderPage />
        </Suspense>
      </main>
    </div>
  );
}
