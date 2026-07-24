'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import AdminTabs from '@/features/admin/presentation/AdminTabs';
import ProductFeedManager from '@/features/admin/productFeed/presentation/ProductFeedManager';

export default function AdminProductFeedPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAdmin>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <AdminTabs />
            <ProductFeedManager />
          </div>
        </RequireAdmin>
      </main>
    </div>
  );
}
