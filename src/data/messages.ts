import type { AppMode } from "../types/settings";
import type { BreakPromptCategory } from "../types/settings";

export const MODE_DEFAULT_MESSAGES: Record<AppMode, string[]> = {
  chill: [
    "Take a gentle visual reset.",
    "Look away and relax your focus.",
    "Pause, breathe, and reset.",
  ],
  focus: [
    "Time for a focused break.",
    "Eyes off screen for a moment.",
    "Reset your vision before the next cycle.",
  ],
  goblin: [
    "Break needed. Step away from the screen.",
    "Your eyes need distance and a slower blink.",
    "Take the break now, then get back in flow.",
  ],
  custom: ["Time to reset your focus."],
};

export const MODE_SUB_MESSAGES: Record<AppMode, string[]> = {
  chill: [
    "Hydrate if you want bonus points.",
    "Small breaks build stronger focus.",
    "We keep it cozy and consistent.",
  ],
  focus: [
    "A short reset protects long sessions.",
    "No noise, just recovery.",
    "Professional mode: active.",
  ],
  goblin: [
    "hydrate? no. blink? yes.",
    "retina defender arc unlocked.",
    "you are one blink away from greatness.",
  ],
  custom: ["Your custom break ritual is ready."],
};

export const BREAK_PROMPTS_BY_CATEGORY: Record<BreakPromptCategory, string[]> = {
  eye: [
    "Look 20 feet away and let your eyes soften.",
    "Blink slowly ten times and release eye tension.",
    "Shift focus between near and far objects.",
  ],
  posture: [
    "Roll your shoulders back and down.",
    "Unclench your jaw and relax your neck.",
    "Sit tall and open your chest for a few breaths.",
  ],
  breathing: [
    "Inhale for four counts, exhale for six counts.",
    "Take five calm breaths before returning.",
    "Breathe slowly and drop tension in your hands.",
  ],
  movement: [
    "Stand up and walk for twenty seconds.",
    "Stretch your wrists and open your fingers.",
    "Step away from your desk and reset your posture.",
  ],
};

export const BADGE_POOL = [
  "blink pilled",
  "retina defender",
  "screen goblin in recovery",
  "focus wizard",
  "streak keeper",
];
