import { BADGE_POOL } from "./messages";
import type { AppSettings, PersistedState, SessionState, StatsState } from "../types/settings";

const DEFAULT_WEEKDAY_SCHEDULES: AppSettings["weekdaySchedules"] = [
  { weekday: 1, enabled: true, start: "09:00", end: "18:00" },
  { weekday: 2, enabled: true, start: "09:00", end: "18:00" },
  { weekday: 3, enabled: true, start: "09:00", end: "18:00" },
  { weekday: 4, enabled: true, start: "09:00", end: "18:00" },
  { weekday: 5, enabled: true, start: "09:00", end: "18:00" },
  { weekday: 6, enabled: false, start: "10:00", end: "14:00" },
  { weekday: 0, enabled: false, start: "10:00", end: "14:00" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingGoal: "eye-comfort",
  onboardingStep: "goal",
  workIntervalMinutes: 20,
  breakDurationSeconds: 20,
  reminderStyle: "normal",
  mode: "focus",
  overlayType: "modal",
  autoStartBreak: true,
  autoRepeat: true,
  snoozeMinutes: 5,
  strictMode: false,
  startOnBoot: false,
  liveInTray: true,
  globalHotkey: "CommandOrControl+Shift+B",
  soundEnabled: true,
  soundVolume: 65,
  reducedMotion: false,
  highContrast: false,
  themeId: "aurora",
  customAccent: "#8b5cf6",
  sparkleBackground: true,
  mascotMode: false,
  customMessages: [],
  workingHoursEnabled: false,
  weekdaySchedules: DEFAULT_WEEKDAY_SCHEDULES,
  smartPause: {
    activityDetectionEnabled: false,
    idleDetectionEnabled: true,
    idleThresholdSeconds: 75,
    pauseDuringFullscreenVideo: false,
    pauseDuringScreenShare: false,
    pauseDuringFullscreenGame: false,
    pauseDuringMeetingMicActivity: false,
    typingAwareDeferralEnabled: true,
    typingDeferralSeconds: 10,
    excludedApps: [],
    allowlistedApps: [],
  },
  breakTierSettings: {
    enabledTiers: ["micro", "short"],
    shortBreakEvery: 4,
    longBreakEvery: 10,
    shortBreakMinutes: 3,
    longBreakMinutes: 12,
  },
  enabledPromptCategories: ["eye", "posture", "breathing", "movement"],
  statsWeeklyTrendEnabled: true,
  privacyStatementAccepted: false,
};

export const DEFAULT_SESSION = (): SessionState => {
  const now = Date.now();
  return {
    startedAt: now,
    nextBreakAt: now + DEFAULT_SETTINGS.workIntervalMinutes * 60_000,
    pauseUntil: null,
    isPaused: false,
    activeSecondsToday: 0,
    longestFocusStreakSeconds: 0,
    currentFocusStreakSeconds: 0,
    lastInteractionAt: now,
    isIdle: false,
    pendingDueBreak: false,
    workCyclesCompletedToday: 0,
    activeBreakTier: "micro",
  };
};

export const DEFAULT_STATS = (): StatsState => ({
  completedToday: 0,
  skippedToday: 0,
  streak: 0,
  adherenceRateToday: 0,
  breaksTakenToday: 0,
  breaksSkippedToday: 0,
  activeMinutesToday: 0,
  longestFocusStreakMinutes: 0,
  weeklyAdherence: [0, 0, 0, 0, 0, 0, 0],
  badges: BADGE_POOL.slice(0, 1),
  history: [],
});

export const DEFAULT_PERSISTED_STATE = (): PersistedState => ({
  onboardingComplete: false,
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS(),
  session: DEFAULT_SESSION(),
});
