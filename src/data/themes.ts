import type { ThemeDefinition } from "../types/settings";

export const THEMES: ThemeDefinition[] = [
  {
    id: "aurora",
    name: "Aurora",
    className: "theme-aurora",
    accent: "#8b5cf6",
    gradient: "from-violet-400/40 via-cyan-300/20 to-fuchsia-400/35",
  },
  {
    id: "matcha",
    name: "Matcha",
    className: "theme-matcha",
    accent: "#22c55e",
    gradient: "from-emerald-300/40 via-lime-200/20 to-green-300/35",
  },
  {
    id: "midnight",
    name: "Midnight",
    className: "theme-midnight",
    accent: "#3b82f6",
    gradient: "from-sky-500/35 via-indigo-500/25 to-blue-800/35",
  },
  {
    id: "bubblegum",
    name: "Bubblegum",
    className: "theme-bubblegum",
    accent: "#f472b6",
    gradient: "from-pink-300/35 via-rose-200/25 to-fuchsia-400/35",
  },
  {
    id: "oled",
    name: "OLED",
    className: "theme-oled",
    accent: "#f59e0b",
    gradient: "from-zinc-900/70 via-black/80 to-zinc-800/70",
  },
  {
    id: "sunset",
    name: "Sunset",
    className: "theme-sunset",
    accent: "#fb7185",
    gradient: "from-orange-300/40 via-rose-300/20 to-fuchsia-400/30",
  },
];

export const FALLBACK_THEME = THEMES[0];
