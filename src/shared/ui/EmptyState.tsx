import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-none border border-dashed border-[#EEEEEE] p-12 text-center bg-white my-12">
      <Icon className="mx-auto h-8 w-8 text-[#717171]" />
      <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-black">{title}</h4>
      <p className="mt-2 text-xs text-[#717171] leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
