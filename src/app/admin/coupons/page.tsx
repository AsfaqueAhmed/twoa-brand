'use client';

import Link from 'next/link';
import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import CouponManager from '@/features/admin/coupons/presentation/CouponManager';

export default function AdminCouponsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAdmin>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-[#EEEEEE] pb-4">
              <Link href="/admin" className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4">
                Inventory
              </Link>
              <Link href="/admin/orders" className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4">
                Orders
              </Link>
              <span className="text-xs font-bold uppercase tracking-wider text-black border-b-2 border-black pb-4 -mb-4">Coupons</span>
            </div>
            <CouponManager />
          </div>
        </RequireAdmin>
      </main>
    </div>
  );
}
