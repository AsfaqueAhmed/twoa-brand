export default function AdminCard({ title, action, className = '', children }: { title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-[#EEEEEE] bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-base font-bold text-black">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
