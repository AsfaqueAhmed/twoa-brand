export default function FeaturedSwitch({ checked, label, onChange, disabled = false }: { checked: boolean; label: string; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-black' : 'bg-[#D4D4D4]'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}
