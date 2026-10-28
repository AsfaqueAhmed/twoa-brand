'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/features/catalog/presentation/Navbar';
import StudioPage from '@/features/customTee/presentation/studio/StudioPage';

// Reads the query string, so it must sit inside a Suspense boundary for the static export.
function MobileRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If on a mobile viewport and not explicitly requesting desktop mode, redirect to dedicated mobile studio
    const isMobile = window.innerWidth < 1024;
    const forceDesktop = searchParams.get('force') === 'desktop';
    if (isMobile && !forceDesktop) {
      const qs = searchParams.toString();
      router.replace(`/custom-tee/studio/mobile${qs ? `?${qs}` : ''}`);
    }
  }, [router, searchParams]);

  return null;
}

export default function StudioRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans lg:h-screen lg:min-h-[704px]">
      <Suspense fallback={null}>
        <MobileRedirect />
      </Suspense>
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <Suspense fallback={<p className="px-4 py-24 text-center text-sm text-[#717171]">Loading studio…</p>}>
          <StudioPage />
        </Suspense>
      </main>
    </div>
  );
}
