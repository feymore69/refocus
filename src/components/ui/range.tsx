import { SettingHint } from "./setting-hint";

interface RangeProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
  helpText?: string;
  disabled?: boolean;
}

export const Range = ({ label, min, max, step = 1, value, unit, onChange, helpText, disabled = false }: RangeProps) => (
  <label className={`block rounded-xl border border-white/15 bg-black/10 px-3 py-2 ${disabled ? "opacity-50" : ""}`}>
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="flex items-center gap-1 text-[var(--text)]">
        {label}
        {helpText ? <SettingHint text={helpText} /> : null}
      </span>
      <span className="font-medium text-[var(--accent)]">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      className="h-2 w-full accent-[var(--accent)]"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);
