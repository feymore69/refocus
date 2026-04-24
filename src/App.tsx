import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Onboarding } from "./features/onboarding/Onboarding";
import { ReminderOverlay } from "./features/reminder-overlay/ReminderOverlay";
import { SettingsView } from "./features/settings/SettingsView";
import { HistoryView } from "./features/stats/HistoryView";
import { DEFAULT_PERSISTED_STATE } from "./data/defaults";
import { FALLBACK_THEME, THEMES } from "./data/themes";
import { loadPersistedState, savePersistedState } from "./services/settingsPersistence";
import { SchedulerService } from "./services/schedulerService";
import { registerBreakHotkey } from "./services/globalHotkeyService";
import { syncAutostart } from "./services/autostartService";
import { bindTrayEvents, setTrayCountdown } from "./services/trayService";
import { configureOverlayWindow, dismissOverlayWindow, reclaimOverlayFocus } from "./services/overlayController";
import { notifyReminder } from "./services/notificationService";
import { useAppStore } from "./store/useAppStore";
import { msToCountdown } from "./lib/time";

const scheduler = new SchedulerService({
  onTick: () => {
    useAppStore.getState().tick();
  },
});

const App = () => {
  const booted = useAppStore((s) => s.booted);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const activeView = useAppStore((s) => s.activeView);
  const setView = useAppStore((s) => s.setView);
  const overlay = useAppStore((s) => s.overlay);
  const settings = useAppStore((s) => s.settings);
  const session = useAppStore((s) => s.session);
  const clockMs = useAppStore((s) => s.clockMs);
  const initialize = useAppStore((s) => s.initialize);
  const triggerReminder = useAppStore((s) => s.triggerReminder);
  const pauseReminders = useAppStore((s) => s.pauseReminders);
  const resumeReminders = useAppStore((s) => s.resumeReminders);
  const recordInteraction = useAppStore((s) => s.recordInteraction);
  const toPersistedState = useAppStore((s) => s.toPersistedState);
  const previousOverlayPhaseRef = useRef(overlay.phase);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await loadPersistedState();
      if (!mounted) return;
      initialize(loaded ?? DEFAULT_PERSISTED_STATE());
      scheduler.start();
    })();
    return () => {
      mounted = false;
      scheduler.stop();
    };
  }, [initialize]);

  useEffect(() => {
    const markInteraction = () => recordInteraction();
    const onVisibility = () => {
      if (!document.hidden) recordInteraction();
    };
    window.addEventListener("mousemove", markInteraction);
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("mousedown", markInteraction);
    window.addEventListener("touchstart", markInteraction);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("mousemove", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("mousedown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [recordInteraction]);

  useEffect(() => {
    if (!booted) return;
    const timeout = window.setTimeout(() => {
      void savePersistedState(toPersistedState());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [booted, settings, session, overlay.phase, toPersistedState]);

  useEffect(() => {
    if (!booted) return;
    void syncAutostart(settings.startOnBoot);
    void invoke("set_close_to_tray", { enabled: settings.liveInTray });
    void registerBreakHotkey(settings.globalHotkey, () => triggerReminder(true));
  }, [booted, settings.startOnBoot, settings.globalHotkey, settings.liveInTray, triggerReminder]);

  useEffect(() => {
    if (!booted) return;
    const msLeft = Math.max(0, session.nextBreakAt - clockMs);
    void setTrayCountdown(session.isPaused ? "Paused" : msToCountdown(msLeft));
  }, [booted, session.nextBreakAt, session.isPaused, clockMs]);

  useEffect(() => {
    if (!booted) return;
    const unlistenPromise = bindTrayEvents({
      onOpenDashboard: () => {
        setView("dashboard");
        void invoke("show_main_window");
      },
      onOpenSettings: () => {
        setView("settings");
        void invoke("show_main_window");
      },
      onStartBreak: () => triggerReminder(true),
      onPause: (option) => pauseReminders(option),
      onResume: () => resumeReminders(),
      onQuit: () => {
        void invoke("quit_app");
      },
    });
    return () => {
      void unlistenPromise.then((u) => u());
    };
  }, [booted, pauseReminders, resumeReminders, setView, triggerReminder]);

  useEffect(() => {
    if (!booted) return;
    const previousPhase = previousOverlayPhaseRef.current;
    const popupVisible = overlay.phase !== "hidden";

    if (popupVisible) {
      void configureOverlayWindow(settings.overlayType, {
        breakActive: true,
        enforceFocus: settings.strictMode && (overlay.phase === "active" || overlay.phase === "completing"),
        popupVisible: true,
      });
    } else if (previousPhase !== "hidden") {
      void dismissOverlayWindow(true);
    }

    if (overlay.phase === "prompt" && previousPhase !== "prompt") {
      void notifyReminder("Refocus", overlay.message);
    }

    previousOverlayPhaseRef.current = overlay.phase;
  }, [booted, overlay.phase, overlay.message, settings.overlayType, settings.strictMode]);

  useEffect(() => {
    if (!booted) return;
    if (!settings.strictMode) return;
    if (overlay.phase !== "active" && overlay.phase !== "completing") return;
    const onBlur = () => {
      window.setTimeout(() => {
        const state = useAppStore.getState();
        const phase = state.overlay.phase;
        if ((phase === "active" || phase === "completing") && state.settings.strictMode) {
          void reclaimOverlayFocus();
        }
      }, 80);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [booted, overlay.phase, settings.strictMode]);

  useEffect(() => {
    const theme = THEMES.find((item) => item.id === settings.themeId) ?? FALLBACK_THEME;
    document.body.className = "";
    document.body.classList.add(theme.className);
    if (settings.highContrast) document.body.classList.add("high-contrast");
    if (settings.reducedMotion) document.body.classList.add("reduced-motion");
    document.body.style.setProperty("--accent", settings.customAccent || theme.accent);
    document.body.style.setProperty("--accent-glow", `${settings.customAccent}66`);
  }, [settings.customAccent, settings.themeId, settings.highContrast, settings.reducedMotion]);

  if (!onboardingComplete) return <Onboarding />;

  return (
    <>
      <AppShell activeView={activeView} onChangeView={setView}>
        {activeView === "dashboard" ? <Dashboard /> : null}
        {activeView === "settings" ? <SettingsView /> : null}
        {activeView === "history" ? <HistoryView /> : null}
      </AppShell>
      <ReminderOverlay />
    </>
  );
};

export default App;
