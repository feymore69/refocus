export type AppMode = "chill" | "focus" | "goblin" | "custom";

export type ReminderStyle = "gentle" | "normal" | "chaotic";

export type OverlayType = "fullscreen" | "modal";

export type PauseOption = "1m" | "5m" | "15m" | "30m" | "1h" | "today" | "tomorrow";

export type OnboardingGoal = "eye-comfort" | "deep-work" | "posture" | "custom";
export type OnboardingStep = "goal" | "preset" | "strictness" | "hours" | "test";
export type BreakTier = "micro" | "short" | "long";
export type BreakPromptCategory = "eye" | "posture" | "breathing" | "movement";

export interface WeekdaySchedule {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean;
  start: string;
  end: string;
}

export interface SmartPauseSettings {
  activityDetectionEnabled: boolean;
  idleDetectionEnabled: boolean;
  idleThresholdSeconds: number;
  pauseDuringFullscreenVideo: boolean;
  pauseDuringScreenShare: boolean;
  pauseDuringFullscreenGame: boolean;
  pauseDuringMeetingMicActivity: boolean;
  typingAwareDeferralEnabled: boolean;
  typingDeferralSeconds: number;
  excludedApps: string[];
  allowlistedApps: string[];
}

export interface BreakTierSettings {
  enabledTiers: BreakTier[];
  shortBreakEvery: number;
  longBreakEvery: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  className: string;
  accent: string;
  gradient: string;
}

export interface SchedulePreset {
  id: string;
  label: string;
  intervalMinutes: number;
  breakSeconds: number;
  description: string;
}

export interface CustomBreakLine {
  title: string;
  description: string;
}

export interface AppSettings {
  onboardingGoal: OnboardingGoal;
  onboardingStep: OnboardingStep;
  workIntervalMinutes: number;
  breakDurationSeconds: number;
  reminderStyle: ReminderStyle;
  mode: AppMode;
  overlayType: OverlayType;
  autoStartBreak: boolean;
  autoRepeat: boolean;
  snoozeMinutes: number;
  strictMode: boolean;
  startOnBoot: boolean;
  liveInTray: boolean;
  globalHotkey: string;
  soundEnabled: boolean;
  soundVolume: number;
  pauseExternalMediaDuringBreak: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  themeId: string;
  customAccent: string;
  sparkleBackground: boolean;
  mascotMode: boolean;
  customMessages: CustomBreakLine[];
  workingHoursEnabled: boolean;
  weekdaySchedules: WeekdaySchedule[];
  smartPause: SmartPauseSettings;
  breakTierSettings: BreakTierSettings;
  enabledPromptCategories: BreakPromptCategory[];
  statsWeeklyTrendEnabled: boolean;
  privacyStatementAccepted: boolean;
}

export interface SessionState {
  startedAt: number;
  nextBreakAt: number;
  pauseUntil: number | null;
  isPaused: boolean;
  activeSecondsToday: number;
  longestFocusStreakSeconds: number;
  currentFocusStreakSeconds: number;
  lastInteractionAt: number;
  isIdle: boolean;
  pendingDueBreak: boolean;
  workCyclesCompletedToday: number;
  activeBreakTier: BreakTier;
}

export interface BreakEvent {
  id: string;
  timestamp: number;
  scheduledTimestamp: number;
  actualTimestamp: number;
  result: "completed" | "skipped" | "snoozed";
  mode: AppMode;
  tier: BreakTier;
  autoStarted: boolean;
  snoozeCount: number;
  remainingSecondsAtAction?: number;
  reason?: string;
}

export interface StatsState {
  completedToday: number;
  skippedToday: number;
  streak: number;
  adherenceRateToday: number;
  breaksTakenToday: number;
  breaksSkippedToday: number;
  activeMinutesToday: number;
  longestFocusStreakMinutes: number;
  weeklyAdherence: number[];
  badges: string[];
  history: BreakEvent[];
}

export type OverlayPhase = "hidden" | "prompt" | "active" | "completing";

export interface OverlayState {
  phase: OverlayPhase;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number;
  endsAt: number | null;
  remainingSeconds: number;
  scheduledFor: number | null;
  autoStarted: boolean;
  snoozeCount: number;
  message: string;
  subMessage: string;
}

export interface PersistedState {
  onboardingComplete: boolean;
  settings: AppSettings;
  stats: StatsState;
  session: SessionState;
}
