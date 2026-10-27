import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import AdminShell from '@/features/admin/presentation/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans">
      <Navbar />
      <RequireAdmin>
        <AdminShell>{children}</AdminShell>
      </RequireAdmin>
    </div>
  );
}
