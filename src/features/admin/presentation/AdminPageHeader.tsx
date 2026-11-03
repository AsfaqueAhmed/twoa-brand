export default function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#717171]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
    </div>
  );
}
