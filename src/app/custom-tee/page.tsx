'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import CustomTeeLanding from '@/features/customTee/presentation/CustomTeeLanding';

export default function CustomTeeRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CustomTeeLanding />
      </main>
    </div>
  );
}
