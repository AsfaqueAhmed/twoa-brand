import { FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import { REPORT_RANGES } from '../domain/reportStats';

export default function ReportRangeSelect({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <FilterSelect aria-label="Date range" value={days} onChange={(e) => onChange(Number(e.target.value))}>
      {REPORT_RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
    </FilterSelect>
  );
}
