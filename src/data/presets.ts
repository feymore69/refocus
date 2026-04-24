import type { AppMode, SchedulePreset } from "../types/settings";

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: "20-20-20",
    label: "20-20-20",
    intervalMinutes: 20,
    breakSeconds: 20,
    description: "Every 20 minutes, look away for 20 seconds to reduce eye strain.",
  },
  {
    id: "pomodoro-soft",
    label: "Pomodoro Soft",
    intervalMinutes: 25,
    breakSeconds: 30,
    description: "A soft Pomodoro rhythm with short visual resets between work sprints.",
  },
  {
    id: "deep-work",
    label: "Deep Work",
    intervalMinutes: 45,
    breakSeconds: 60,
    description: "Longer focus blocks with structured recovery so flow stays sustainable.",
  },
  {
    id: "marathon",
    label: "Marathon",
    intervalMinutes: 60,
    breakSeconds: 120,
    description: "For extended sessions, with stronger breaks to protect eyes and posture.",
  },
];

export const MODE_LABELS: Record<AppMode, string> = {
  chill: "Chill Mode",
  focus: "Focus Mode",
  goblin: "Goblin Mode",
  custom: "Custom Mode",
};
