import { Store } from "@tauri-apps/plugin-store";
import type { PersistedState } from "../types/settings";
import { DEFAULT_PERSISTED_STATE } from "../data/defaults";

const LEGACY_STORE_FILE = "look-away-settings.json";
const STORE_FILE = "refocus-settings.json";
const KEY = "app-state";

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

let storePromise: Promise<Store> | null = null;
const getStore = () => {
  if (!storePromise) {
    storePromise = Store.load(STORE_FILE);
  }
  return storePromise;
};

const normalizeState = (state: PersistedState): PersistedState => ({
  ...state,
  stats: {
    ...state.stats,
    history: state.stats.history.map((item) => ({
      ...item,
      tier: item.tier ?? "micro",
      scheduledTimestamp: item.scheduledTimestamp ?? item.timestamp,
      actualTimestamp: item.actualTimestamp ?? item.timestamp,
      autoStarted: item.autoStarted ?? false,
      snoozeCount: item.snoozeCount ?? 0,
    })),
  },
  settings: {
    ...state.settings,
    customMessages: ((state.settings.customMessages as unknown[]) ?? []).map((item) => {
      if (typeof item === "string") {
        return {
          title: item,
          description: "Look away and reset your focus.",
        };
      }
      if (item && typeof item === "object") {
        const title = typeof (item as { title?: unknown }).title === "string" ? (item as { title: string }).title : "";
        const description =
          typeof (item as { description?: unknown }).description === "string"
            ? (item as { description: string }).description
            : "Look away and reset your focus.";
        return {
          title: title.trim() || "Take a short reset",
          description: description.trim() || "Look away and reset your focus.",
        };
      }
      return {
        title: "Take a short reset",
        description: "Look away and reset your focus.",
      };
    }),
    smartPause: {
      ...state.settings.smartPause,
      activityDetectionEnabled: state.settings.smartPause.activityDetectionEnabled ?? false,
    },
    breakTierSettings: {
      ...state.settings.breakTierSettings,
      enabledTiers: (() => {
        const next = (state.settings.breakTierSettings?.enabledTiers ?? ["micro"]).filter(
          (tier) => tier === "micro" || tier === "long",
        );
        if (!next.includes("micro")) next.unshift("micro");
        return Array.from(new Set(next));
      })(),
      shortBreakEvery: clampNumber(state.settings.breakTierSettings?.shortBreakEvery, 2, 20, 4),
      longBreakEvery: clampNumber(state.settings.breakTierSettings?.longBreakEvery, 4, 20, 10),
      shortBreakMinutes: clampNumber(state.settings.breakTierSettings?.shortBreakMinutes, 2, 10, 3),
      longBreakMinutes: clampNumber(state.settings.breakTierSettings?.longBreakMinutes, 10, 30, 12),
    },
    enabledPromptCategories:
      state.settings.enabledPromptCategories && state.settings.enabledPromptCategories.length > 0
        ? state.settings.enabledPromptCategories
        : ["eye", "posture", "breathing", "movement"],
  },
});

export const loadPersistedState = async (): Promise<PersistedState> => {
  try {
    const store = await getStore();
    const saved = await store.get<PersistedState>(KEY);
    if (!saved) {
      const legacyStore = await Store.load(LEGACY_STORE_FILE);
      const legacySaved = await legacyStore.get<PersistedState>(KEY);
      if (!legacySaved) return DEFAULT_PERSISTED_STATE();
      await store.set(KEY, legacySaved);
      await store.save();
      await legacyStore.delete(KEY);
      await legacyStore.save();
      return normalizeState({
        ...DEFAULT_PERSISTED_STATE(),
        ...legacySaved,
        settings: {
          ...DEFAULT_PERSISTED_STATE().settings,
          ...legacySaved.settings,
          smartPause: {
            ...DEFAULT_PERSISTED_STATE().settings.smartPause,
            ...legacySaved.settings?.smartPause,
          },
          breakTierSettings: {
            ...DEFAULT_PERSISTED_STATE().settings.breakTierSettings,
            ...legacySaved.settings?.breakTierSettings,
          },
          weekdaySchedules:
            legacySaved.settings?.weekdaySchedules ?? DEFAULT_PERSISTED_STATE().settings.weekdaySchedules,
        },
        session: { ...DEFAULT_PERSISTED_STATE().session, ...legacySaved.session },
        stats: { ...DEFAULT_PERSISTED_STATE().stats, ...legacySaved.stats },
      });
    }
    const merged = normalizeState({
      ...DEFAULT_PERSISTED_STATE(),
      ...saved,
      settings: {
        ...DEFAULT_PERSISTED_STATE().settings,
        ...saved.settings,
        smartPause: {
          ...DEFAULT_PERSISTED_STATE().settings.smartPause,
          ...saved.settings?.smartPause,
        },
        breakTierSettings: {
          ...DEFAULT_PERSISTED_STATE().settings.breakTierSettings,
          ...saved.settings?.breakTierSettings,
        },
        weekdaySchedules: saved.settings?.weekdaySchedules ?? DEFAULT_PERSISTED_STATE().settings.weekdaySchedules,
      },
      session: { ...DEFAULT_PERSISTED_STATE().session, ...saved.session },
      stats: { ...DEFAULT_PERSISTED_STATE().stats, ...saved.stats },
    });
    if (merged.settings.overlayType !== "fullscreen" && merged.settings.overlayType !== "modal") {
      merged.settings.overlayType = "modal";
    }
    return merged;
  } catch (error) {
    console.error("Failed to load settings", error);
    return DEFAULT_PERSISTED_STATE();
  }
};

export const savePersistedState = async (state: PersistedState) => {
  const store = await getStore();
  await store.set(KEY, state);
  await store.save();
};
