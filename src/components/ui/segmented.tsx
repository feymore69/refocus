import { cn } from "../../lib/cn";

interface SegmentedProps<T extends string> {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}

export const Segmented = <T extends string>({ value, options, onChange }: SegmentedProps<T>) => (
  <div className="flex rounded-xl bg-black/20 p-1">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        aria-pressed={value === option.value}
        className={cn(
          "flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition",
          value === option.value
            ? "border-white/35 bg-white/20 text-[var(--text)] shadow-inner shadow-white/15"
            : "border-transparent text-[var(--muted)] hover:border-white/10 hover:text-[var(--text)]",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
