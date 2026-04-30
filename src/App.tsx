import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./features/dashboard/Dashboard";
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
import { pauseExternalMedia, resumeExternalMedia } from "./services/systemMediaService";
import { playBreakCompleteCue, playReminderCue } from "./services/soundService";
import { useAppStore } from "./store/useAppStore";
import { msToCountdown } from "./lib/time";

const scheduler = new SchedulerService({
  onTick: () => {
    useAppStore.getState().tick();
  },
});

const App = () => {
  const booted = useAppStore((s) => s.booted);
  const activeView = useAppStore((s) => s.activeView);
  const historyRangeFilter = useAppStore((s) => s.historyRangeFilter);
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
  const previousOverlayUserInitiatedRef = useRef(overlay.userInitiated);
  const pausedExternalMediaRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = (await loadPersistedState()) ?? DEFAULT_PERSISTED_STATE();
      const launchedFromAutostart = await invoke<boolean>("was_launched_from_autostart").catch(() => false);
      if (!mounted) return;
      initialize(
        launchedFromAutostart
          ? {
              ...loaded,
              session: {
                ...loaded.session,
                nextBreakAt: Date.now() + loaded.settings.workIntervalMinutes * 60_000,
                pendingDueBreak: false,
                currentFocusStreakSeconds: 0,
                isIdle: false,
                lastInteractionAt: Date.now(),
              },
            }
          : loaded,
      );
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
  }, [booted, settings, session, overlay.phase, historyRangeFilter, toPersistedState]);

  useEffect(() => {
    if (!booted) return;
    void syncAutostart(settings.startOnBoot).catch((error) => {
      console.error("Autostart setup failed", error);
    });
    void invoke("set_close_to_tray", { enabled: settings.liveInTray }).catch((error) => {
      console.error("Failed to sync close-to-tray setting", error);
    });
    void registerBreakHotkey(settings.globalHotkey, () => triggerReminder(true)).catch((error) => {
      console.error("Global hotkey setup failed", error);
    });
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
    const previousUserInitiated = previousOverlayUserInitiatedRef.current;
    const popupVisible = overlay.phase !== "hidden";
    const enteringPopup = popupVisible && previousPhase === "hidden";
    const enteringCompleting = overlay.phase === "completing" && previousPhase !== "completing";
    const leavingPopup = overlay.phase === "hidden" && previousPhase !== "hidden";

    if (popupVisible) {
      void (async () => {
        try {
          await configureOverlayWindow(settings.overlayType, {
            breakActive: true,
            enforceFocus: true,
            popupVisible: true,
          });
        } catch (error) {
          console.error("Failed to configure overlay window", error);
        }
        try {
          await invoke("set_overlay_lock", {
            enabled: true,
            fullscreen: settings.overlayType === "fullscreen",
          });
        } catch (error) {
          console.error("Failed to enable overlay lock", error);
        }
      })();
    } else if (leavingPopup) {
      void (async () => {
        try {
          await invoke("set_overlay_lock", { enabled: false, fullscreen: false });
        } catch (error) {
          console.error("Failed to release overlay lock", error);
        }
        try {
          await dismissOverlayWindow(!previousUserInitiated);
        } catch (error) {
          console.error("Failed to dismiss overlay window", error);
        }
        if (!previousUserInitiated) {
          try {
            await invoke("hide_main_window");
          } catch (error) {
            console.error("Failed to hide main window", error);
          }
        }
      })();
    }

    if (enteringPopup) {
      void notifyReminder("Refocus", overlay.message).catch((error) => {
        console.error("Notification failed", error);
      });
      void playReminderCue({ enabled: settings.soundEnabled, volume: settings.soundVolume }).catch((error) => {
        console.error("Reminder cue failed", error);
      });
    }

    if (enteringPopup && settings.pauseExternalMediaDuringBreak) {
      void pauseExternalMedia()
        .then((paused) => {
          pausedExternalMediaRef.current = paused;
        })
        .catch((error) => {
          console.error("Pause external media failed", error);
          pausedExternalMediaRef.current = false;
        });
    }

    if (enteringCompleting) {
      void playBreakCompleteCue({ enabled: settings.soundEnabled, volume: settings.soundVolume }).catch((error) => {
        console.error("Break complete cue failed", error);
      });
    }

    if (leavingPopup && pausedExternalMediaRef.current) {
      void resumeExternalMedia()
        .catch((error) => {
          console.error("Resume external media failed", error);
        })
        .finally(() => {
          pausedExternalMediaRef.current = false;
        });
    }

    previousOverlayPhaseRef.current = overlay.phase;
    previousOverlayUserInitiatedRef.current = overlay.userInitiated;
  }, [
    booted,
    overlay.phase,
    overlay.message,
    overlay.userInitiated,
    settings.overlayType,
    settings.soundEnabled,
    settings.soundVolume,
    settings.pauseExternalMediaDuringBreak,
  ]);

  useEffect(() => {
    if (!booted) return;
    if (overlay.phase === "hidden") return;
    const onBlur = () => {
      window.setTimeout(() => {
        const state = useAppStore.getState();
        const phase = state.overlay.phase;
        if (phase !== "hidden") {
          void reclaimOverlayFocus();
        }
      }, 80);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [booted, overlay.phase]);

  useEffect(() => {
    const theme = THEMES.find((item) => item.id === settings.themeId) ?? FALLBACK_THEME;
    document.body.className = "";
    document.body.classList.add(theme.className);
    if (settings.highContrast) document.body.classList.add("high-contrast");
    if (settings.reducedMotion) document.body.classList.add("reduced-motion");
    document.body.style.setProperty("--accent", settings.customAccent || theme.accent);
    document.body.style.setProperty("--accent-glow", `${settings.customAccent}66`);
  }, [settings.customAccent, settings.themeId, settings.highContrast, settings.reducedMotion]);

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
