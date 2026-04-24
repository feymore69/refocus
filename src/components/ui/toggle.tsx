import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { SettingHint } from "./setting-hint";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  helpText?: string;
  disabled?: boolean;
}

export const Toggle = ({ checked, onChange, label, description, helpText, disabled = false }: ToggleProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "flex w-full items-center justify-between gap-4 rounded-xl border border-white/15 bg-black/10 px-3 py-2 text-left",
      disabled && "cursor-not-allowed opacity-50",
    )}
  >
    <div>
      <p className="flex items-center gap-1 text-sm font-medium text-[var(--text)]">
        {label}
        {helpText ? <SettingHint text={helpText} /> : null}
      </p>
      {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
    </div>
    <span
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-[var(--accent)]" : "bg-white/20",
      )}
      aria-hidden
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className={cn("h-5 w-5 rounded-full bg-white shadow", checked ? "ml-5" : "ml-0.5")}
      />
    </span>
  </button>
);
