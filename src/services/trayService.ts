import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { PauseOption } from "../types/settings";

type TrayAction =
  | "open-dashboard"
  | "open-settings"
  | "start-break"
  | "pause-5m"
  | "pause-15m"
  | "pause-30m"
  | "pause-tomorrow"
  | "resume"
  | "quit";

export const bindTrayEvents = async (handlers: {
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onStartBreak: () => void;
  onPause: (option: PauseOption) => void;
  onResume: () => void;
  onQuit: () => void;
}) => {
  return listen<TrayAction>("tray-action", async (event) => {
    switch (event.payload) {
      case "open-dashboard":
        handlers.onOpenDashboard();
        break;
      case "open-settings":
        handlers.onOpenSettings();
        break;
      case "start-break":
        handlers.onStartBreak();
        break;
      case "pause-5m":
        handlers.onPause("5m");
        break;
      case "pause-15m":
        handlers.onPause("15m");
        break;
      case "pause-30m":
        handlers.onPause("30m");
        break;
      case "pause-tomorrow":
        handlers.onPause("tomorrow");
        break;
      case "resume":
        handlers.onResume();
        break;
      case "quit":
        handlers.onQuit();
        await invoke("quit_app");
        break;
      default:
        break;
    }
  });
};

export const setTrayCountdown = async (label: string) => {
  try {
    await invoke("set_tray_remaining", { remaining: label });
  } catch (error) {
    console.error("Failed to update tray tooltip", error);
  }
};
