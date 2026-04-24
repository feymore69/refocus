import { CircleHelp } from "lucide-react";

interface SettingHintProps {
  text: string;
}

export const SettingHint = ({ text }: SettingHintProps) => (
  <span
    title={text}
    aria-label={text}
    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted)]"
  >
    <CircleHelp className="h-3.5 w-3.5" />
  </span>
);
