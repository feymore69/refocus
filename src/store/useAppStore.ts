import { create } from "zustand";
import { nanoid } from "nanoid/non-secure";
import { DEFAULT_PERSISTED_STATE, DEFAULT_STATS } from "../data/defaults";
import { BADGE_POOL, BREAK_PROMPTS_BY_CATEGORY, MODE_DEFAULT_MESSAGES } from "../data/messages";
import { pauseOptionToMs } from "../lib/time";
import type {
  AppMode,
  AppSettings,
  BreakTier,
  OnboardingGoal,
  OnboardingStep,
  OverlayState,
  PauseOption,
  PersistedState,
  SessionState,
  StatsState,
  WeekdaySchedule,
} from "../types/settings";

type View = "dashboard" | "settings" | "history";

interface AppStoreState {
  booted: boolean;
  clockMs: number;
  onboardingComplete: boolean;
  settings: AppSettings;
  session: SessionState;
  stats: StatsState;
  overlay: OverlayState;
  activeView: View;
  remindersPausedLabel: string | null;
  initialize: (state: PersistedState) => void;
  completeOnboarding: () => void;
  setOnboardingGoal: (goal: OnboardingGoal) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setView: (view: View) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateWeekdaySchedule: (schedule: WeekdaySchedule) => void;
  resetTimer: () => void;
  pauseReminders: (option: PauseOption) => void;
  resumeReminders: () => void;
  triggerReminder: (forced?: boolean) => void;
  clearHistory: () => void;
  startBreakNow: () => void;
  skipBreak: (reasonOverride?: string) => void;
  snoozeBreak: () => void;
  closeOverlay: () => void;
  recordInteraction: () => void;
  tick: () => void;
  toPersistedState: () => PersistedState;
}

const defaultState = DEFAULT_PERSISTED_STATE();
const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)] ?? items[0];
const nextBreakTimestamp = (settings: AppSettings) => Date.now() + settings.workIntervalMinutes * 60_000;

const clampHistory = (stats: StatsState): StatsState => ({
  ...stats,
  history: stats.history.slice(0, 200),
});

const toBreakEvent = (input: {
  result: "completed" | "skipped" | "snoozed";
  mode: AppSettings["mode"];
  tier: BreakTier;
  scheduledTimestamp: number;
  actualTimestamp: number;
  autoStarted: boolean;
  snoozeCount: number;
  remainingSecondsAtAction?: number;
  reason?: string;
}) => ({
  id: nanoid(),
  timestamp: input.actualTimestamp,
  scheduledTimestamp: input.scheduledTimestamp,
  actualTimestamp: input.actualTimestamp,
  result: input.result,
  mode: input.mode,
  tier: input.tier,
  autoStarted: input.autoStarted,
  snoozeCount: input.snoozeCount,
  remainingSecondsAtAction: input.remainingSecondsAtAction,
  reason: input.reason,
});

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfDay = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate());

const rebuildWeeklyAdherence = (history: StatsState["history"]): number[] => {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }).map((_, offset) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - offset));
    const dayItems = history.filter((item) => isSameLocalDay(new Date(item.timestamp), day));
    const completed = dayItems.filter((item) => item.result === "completed").length;
    const skipped = dayItems.filter((item) => item.result === "skipped").length;
    const total = completed + skipped;
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  });
};

const calcAdherence = (stats: StatsState) => {
  const total = stats.breaksTakenToday + stats.breaksSkippedToday;
  if (!total) return 0;
  return Math.round((stats.breaksTakenToday / total) * 100);
};

const isNowWithinSchedule = (settings: AppSettings, now: Date) => {
  if (!settings.workingHoursEnabled) return true;
  const day = now.getDay() as WeekdaySchedule["weekday"];
  const entry = settings.weekdaySchedules.find((item) => item.weekday === day);
  if (!entry || !entry.enabled) return false;
  const [sh, sm] = entry.start.split(":").map(Number);
  const [eh, em] = entry.end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  if (start < end) return current >= start && current <= end;
  return current >= start || current <= end;
};

const selectBreakTier = (session: SessionState, settings: AppSettings): BreakTier => {
  const { enabledTiers, shortBreakEvery, longBreakEvery } = settings.breakTierSettings;
  const cycle = session.workCyclesCompletedToday + 1;
  if (enabledTiers.includes("long") && cycle % Math.max(1, longBreakEvery) === 0) return "long";
  if (enabledTiers.includes("short") && cycle % Math.max(1, shortBreakEvery) === 0) return "short";
  return enabledTiers.includes("micro") ? "micro" : "short";
};

const breakSecondsForTier = (tier: BreakTier, settings: AppSettings) => {
  if (tier === "micro") return settings.breakDurationSeconds;
  if (tier === "short") return settings.breakTierSettings.shortBreakMinutes * 60;
  return settings.breakTierSettings.longBreakMinutes * 60;
};

const buildOverlay = (
  state: Pick<AppStoreState, "settings" | "session">,
  options?: { initiatedByUser?: boolean; scheduledFor?: number; snoozeCount?: number },
): OverlayState => {
  const modeMessages = MODE_DEFAULT_MESSAGES[state.settings.mode];
  const categories = state.settings.enabledPromptCategories.length
    ? state.settings.enabledPromptCategories
    : (["eye"] as const);
  const instructions = categories.flatMap((category) => BREAK_PROMPTS_BY_CATEGORY[category]);
  const hasCustomLines = state.settings.customMessages.length > 0;
  const selectedCustom = hasCustomLines ? randomFrom(state.settings.customMessages) : null;
  const breakTier = selectBreakTier(state.session, state.settings);
  const breakSeconds = breakSecondsForTier(breakTier, state.settings);
  const phase = state.settings.autoStartBreak ? "active" : "prompt";
  const now = Date.now();
  const autoStarted = phase === "active" && !options?.initiatedByUser;
  return {
    phase,
    startedAt: phase === "active" ? now : null,
    completedAt: null,
    durationMs: breakSeconds * 1000,
    endsAt: phase === "active" ? now + breakSeconds * 1000 : null,
    remainingSeconds: breakSeconds,
    scheduledFor: options?.scheduledFor ?? state.session.nextBreakAt,
    autoStarted,
    snoozeCount: options?.snoozeCount ?? 0,
    message: hasCustomLines ? selectedCustom?.title ?? "Take a short reset" : randomFrom(modeMessages),
    subMessage: hasCustomLines
      ? selectedCustom?.description ?? "Look away and reset your focus."
      : randomFrom(instructions),
  };
};

const baseStatsFrom = (stats: StatsState, session: SessionState): StatsState => ({
  ...stats,
  activeMinutesToday: Math.floor(session.activeSecondsToday / 60),
  longestFocusStreakMinutes: Math.floor(session.longestFocusStreakSeconds / 60),
});

export const useAppStore = create<AppStoreState>((set, get) => ({
  booted: false,
  clockMs: Date.now(),
  onboardingComplete: defaultState.onboardingComplete,
  settings: defaultState.settings,
  session: defaultState.session,
  stats: defaultState.stats,
  overlay: {
    phase: "hidden",
    startedAt: null,
    completedAt: null,
    durationMs: defaultState.settings.breakDurationSeconds * 1000,
    endsAt: null,
    remainingSeconds: defaultState.settings.breakDurationSeconds,
    scheduledFor: null,
    autoStarted: false,
    snoozeCount: 0,
    message: "",
    subMessage: "",
  },
  activeView: "dashboard",
  remindersPausedLabel: null,
  initialize: (state) =>
    set({
      booted: true,
      onboardingComplete: state.onboardingComplete,
      settings: state.settings,
      session: state.session,
      stats: {
        ...clampHistory(state.stats),
        weeklyAdherence: rebuildWeeklyAdherence(state.stats.history),
      },
      overlay: {
        phase: "hidden",
        startedAt: null,
        completedAt: null,
        durationMs: state.settings.breakDurationSeconds * 1000,
        endsAt: null,
        remainingSeconds: state.settings.breakDurationSeconds,
        scheduledFor: null,
        autoStarted: false,
        snoozeCount: 0,
        message: "",
        subMessage: "",
      },
    }),
  completeOnboarding: () => set({ onboardingComplete: true }),
  setOnboardingGoal: (goal) => set((s) => ({ settings: { ...s.settings, onboardingGoal: goal } })),
  setOnboardingStep: (step) => set((s) => ({ settings: { ...s.settings, onboardingStep: step } })),
  setView: (view) => set({ activeView: view }),
  updateSettings: (patch) =>
    set((state) => {
      const settings = { ...state.settings, ...patch };
      return {
        settings,
        session: {
          ...state.session,
          nextBreakAt: nextBreakTimestamp(settings),
        },
      };
    }),
  updateWeekdaySchedule: (schedule) =>
    set((state) => ({
      settings: {
        ...state.settings,
        weekdaySchedules: state.settings.weekdaySchedules.map((item) => (item.weekday === schedule.weekday ? schedule : item)),
      },
    })),
  resetTimer: () =>
    set((state) => ({
      session: { ...state.session, nextBreakAt: nextBreakTimestamp(state.settings) },
    })),
  pauseReminders: (option) =>
    set((state) => {
      const ms = pauseOptionToMs(option);
      const pauseUntil = Date.now() + ms;
      const label =
        option === "today"
          ? "Paused until tomorrow"
          : option === "tomorrow"
            ? "Paused until tomorrow 9:00"
            : `Paused ${option}`;
      return {
        session: { ...state.session, isPaused: true, pauseUntil },
        remindersPausedLabel: label,
      };
    }),
  resumeReminders: () =>
    set((state) => ({
      session: {
        ...state.session,
        isPaused: false,
        pauseUntil: null,
        pendingDueBreak: false,
        nextBreakAt: nextBreakTimestamp(state.settings),
      },
      remindersPausedLabel: null,
    })),
  triggerReminder: (forced) =>
    set((state) => {
      if (!forced && (state.overlay.phase !== "hidden" || state.session.isPaused)) return state;
      const scheduledFor = forced ? Date.now() : state.session.nextBreakAt;
      return {
        overlay: buildOverlay(state, { initiatedByUser: !!forced, scheduledFor, snoozeCount: 0 }),
        session: {
          ...state.session,
          activeBreakTier: selectBreakTier(state.session, state.settings),
          pendingDueBreak: false,
        },
      };
    }),
  clearHistory: () =>
    set((state) => ({
      stats: {
        ...DEFAULT_STATS(),
        weeklyAdherence: rebuildWeeklyAdherence([]),
      },
      session: {
        ...state.session,
        workCyclesCompletedToday: 0,
      },
    })),
  startBreakNow: () =>
    set((state) => {
      const now = Date.now();
      return {
        overlay: {
          ...state.overlay,
          phase: "active",
          startedAt: now,
          completedAt: null,
          endsAt: now + state.overlay.durationMs,
          remainingSeconds: Math.max(1, Math.ceil(state.overlay.durationMs / 1000)),
          autoStarted: false,
        },
        session: { ...state.session, pendingDueBreak: false },
      };
    }),
  skipBreak: (reasonOverride) =>
    set((state) => {
      const now = Date.now();
      const nextStats = clampHistory(
        baseStatsFrom(
          {
            ...state.stats,
            skippedToday: state.stats.skippedToday + 1,
            breaksSkippedToday: state.stats.breaksSkippedToday + 1,
            adherenceRateToday: calcAdherence({
              ...state.stats,
              breaksSkippedToday: state.stats.breaksSkippedToday + 1,
            } as StatsState),
            history: [
              toBreakEvent({
                result: "skipped",
                mode: state.settings.mode,
                tier: state.session.activeBreakTier,
                scheduledTimestamp: state.overlay.scheduledFor ?? state.session.nextBreakAt,
                actualTimestamp: now,
                autoStarted: state.overlay.autoStarted,
                snoozeCount: state.overlay.snoozeCount,
                remainingSecondsAtAction: state.overlay.remainingSeconds,
                reason: reasonOverride ?? "Skipped from break overlay",
              }),
              ...state.stats.history,
            ],
          },
          state.session,
        ),
      );
      nextStats.weeklyAdherence = rebuildWeeklyAdherence(nextStats.history);
      return {
        stats: nextStats,
        overlay: {
          ...state.overlay,
          phase: "hidden",
          startedAt: null,
          completedAt: null,
          endsAt: null,
          scheduledFor: null,
          autoStarted: false,
          snoozeCount: 0,
        },
        session: {
          ...state.session,
          currentFocusStreakSeconds: 0,
          pendingDueBreak: false,
          nextBreakAt: nextBreakTimestamp(state.settings),
        },
      };
    }),
  snoozeBreak: () =>
    set((state) => {
      const now = Date.now();
      const nextSnoozeCount = state.overlay.snoozeCount + 1;
      const nextStats = clampHistory(
        baseStatsFrom(
          {
            ...state.stats,
            adherenceRateToday: calcAdherence(state.stats),
            history: [
              toBreakEvent({
                result: "snoozed",
                mode: state.settings.mode,
                tier: state.session.activeBreakTier,
                scheduledTimestamp: state.overlay.scheduledFor ?? state.session.nextBreakAt,
                actualTimestamp: now,
                autoStarted: state.overlay.autoStarted,
                snoozeCount: nextSnoozeCount,
                remainingSecondsAtAction: state.overlay.remainingSeconds,
                reason: `Snoozed ${state.settings.snoozeMinutes} min`,
              }),
              ...state.stats.history,
            ],
          },
          state.session,
        ),
      );
      nextStats.weeklyAdherence = rebuildWeeklyAdherence(nextStats.history);
      return {
        stats: nextStats,
        overlay: {
          ...state.overlay,
          phase: "hidden",
          startedAt: null,
          completedAt: null,
          endsAt: null,
          scheduledFor: null,
          autoStarted: false,
          snoozeCount: 0,
        },
        session: {
          ...state.session,
          pendingDueBreak: false,
          nextBreakAt: now + state.settings.snoozeMinutes * 60_000,
        },
      };
    }),
  closeOverlay: () =>
    set((state) => ({
      overlay: {
        ...state.overlay,
        phase: "hidden",
        startedAt: null,
        completedAt: null,
        endsAt: null,
        scheduledFor: null,
        autoStarted: false,
        snoozeCount: 0,
      },
    })),
  recordInteraction: () =>
    set((state) => ({
      session: { ...state.session, lastInteractionAt: Date.now(), isIdle: false },
    })),
  tick: () =>
    set((state) => {
      const now = Date.now();
      const nowDate = new Date(now);
      const inHours = isNowWithinSchedule(state.settings, nowDate);
      const activityEnabled = state.settings.smartPause.activityDetectionEnabled;
      const idleEnabled = activityEnabled && state.settings.smartPause.idleDetectionEnabled;
      const idleThresholdMs = state.settings.smartPause.idleThresholdSeconds * 1000;
      const isIdleNow = idleEnabled && now - state.session.lastInteractionAt > idleThresholdMs;

      let nextSession: SessionState = { ...state.session, isIdle: isIdleNow };
      let nextStats: StatsState = { ...state.stats };
      let nextOverlay = state.overlay;
      const base = { clockMs: now };

      if (nextSession.isPaused && nextSession.pauseUntil && now >= nextSession.pauseUntil) {
        nextSession = {
          ...nextSession,
          isPaused: false,
          pauseUntil: null,
          nextBreakAt: nextBreakTimestamp(state.settings),
        };
      }

      const shouldCountActive =
        !nextSession.isPaused && !isIdleNow && inHours && nextOverlay.phase === "hidden";
      if (shouldCountActive) {
        nextSession.activeSecondsToday += 1;
        nextSession.currentFocusStreakSeconds += 1;
        nextSession.longestFocusStreakSeconds = Math.max(
          nextSession.longestFocusStreakSeconds,
          nextSession.currentFocusStreakSeconds,
        );
        nextStats = baseStatsFrom(nextStats, nextSession);
      }

      if (nextOverlay.phase === "active" && nextOverlay.startedAt) {
        const elapsedMs = now - nextOverlay.startedAt;
        const remainingMs = Math.max(0, nextOverlay.durationMs - elapsedMs);
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        if (remainingSeconds === 0) {
          const completedStats = {
            ...nextStats,
            completedToday: nextStats.completedToday + 1,
            streak: nextStats.streak + 1,
            breaksTakenToday: nextStats.breaksTakenToday + 1,
            badges: nextStats.badges.length >= 3 ? nextStats.badges : BADGE_POOL.slice(0, 3),
            history: [
              toBreakEvent({
                result: "completed",
                mode: state.settings.mode,
                tier: nextSession.activeBreakTier,
                scheduledTimestamp: nextOverlay.scheduledFor ?? nextSession.nextBreakAt,
                actualTimestamp: now,
                autoStarted: nextOverlay.autoStarted,
                snoozeCount: nextOverlay.snoozeCount,
                remainingSecondsAtAction: 0,
                reason: nextOverlay.autoStarted ? "Auto-started break completed" : "Break completed",
              }),
              ...nextStats.history,
            ],
          };
          completedStats.adherenceRateToday = calcAdherence(completedStats as StatsState);
          nextStats = clampHistory(baseStatsFrom(completedStats as StatsState, nextSession));
          nextStats.weeklyAdherence = rebuildWeeklyAdherence(nextStats.history);
          nextOverlay = {
            ...nextOverlay,
            phase: "completing",
            completedAt: now,
            endsAt: null,
            remainingSeconds: 0,
          };
          nextSession = {
            ...nextSession,
            pendingDueBreak: false,
            currentFocusStreakSeconds: 0,
            workCyclesCompletedToday: nextSession.workCyclesCompletedToday + 1,
            nextBreakAt: nextBreakTimestamp(state.settings),
          };
        } else {
          nextOverlay = { ...nextOverlay, endsAt: nextOverlay.startedAt + nextOverlay.durationMs, remainingSeconds };
        }
      }

      if (nextOverlay.phase === "completing" && nextOverlay.completedAt && now - nextOverlay.completedAt >= 900) {
        nextOverlay = {
          ...nextOverlay,
          phase: "hidden",
          startedAt: null,
          completedAt: null,
          endsAt: null,
          scheduledFor: null,
          autoStarted: false,
          snoozeCount: 0,
        };
      }

      const due = now >= nextSession.nextBreakAt;
      if (!nextSession.isPaused && inHours && nextOverlay.phase === "hidden" && due) {
        const typingAware = activityEnabled && state.settings.smartPause.typingAwareDeferralEnabled;
        const typingDeferralMs = state.settings.smartPause.typingDeferralSeconds * 1000;
        const currentlyTyping = now - nextSession.lastInteractionAt < typingDeferralMs;
        if (typingAware && currentlyTyping) {
          nextSession.pendingDueBreak = true;
        } else {
          nextOverlay = buildOverlay(
            { settings: state.settings, session: nextSession },
            { initiatedByUser: false, scheduledFor: nextSession.nextBreakAt, snoozeCount: 0 },
          );
          nextSession.activeBreakTier = selectBreakTier(nextSession, state.settings);
          nextSession.pendingDueBreak = false;
        }
      }

      if (nextSession.pendingDueBreak && nextOverlay.phase === "hidden") {
        const typingDeferralMs = state.settings.smartPause.typingDeferralSeconds * 1000;
        const typingStopped = now - nextSession.lastInteractionAt >= typingDeferralMs;
        if (typingStopped || !activityEnabled) {
          nextOverlay = buildOverlay(
            { settings: state.settings, session: nextSession },
            { initiatedByUser: false, scheduledFor: nextSession.nextBreakAt, snoozeCount: 0 },
          );
          nextSession.activeBreakTier = selectBreakTier(nextSession, state.settings);
          nextSession.pendingDueBreak = false;
        }
      }

      return { ...base, session: nextSession, stats: clampHistory(nextStats), overlay: nextOverlay };
    }),
  toPersistedState: () => {
    const state = get();
    return {
      onboardingComplete: state.onboardingComplete,
      settings: state.settings,
      session: state.session,
      stats: state.stats,
    };
  },
}));

export const getModeEnergy = (mode: AppMode) => {
  if (mode === "goblin") return "Maximum drama";
  if (mode === "focus") return "Quiet productivity";
  if (mode === "chill") return "Soft and cozy";
  return "Custom tuned";
};
