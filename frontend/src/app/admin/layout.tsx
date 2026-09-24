import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar role="admin" />
      <div className="flex-1 overflow-auto bg-slate-50 p-6">{children}</div>
    </div>
  );
}
