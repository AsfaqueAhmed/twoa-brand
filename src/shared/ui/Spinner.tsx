import { Loader2 } from 'lucide-react';

export default function Spinner({ className = 'h-8 w-8 text-black' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}
