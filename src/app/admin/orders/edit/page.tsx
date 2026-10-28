'use client';

import { Suspense } from 'react';
import Spinner from '@/shared/ui/Spinner';
import EditOrderPage from '@/features/admin/orders/presentation/EditOrderPage';

export default function AdminEditOrderRoute() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
      <EditOrderPage />
    </Suspense>
  );
}
