import { getCurrentWindow } from "@tauri-apps/api/window";
import type { OverlayType } from "../types/settings";

export const configureOverlayWindow = async (
  overlayType: OverlayType,
  options: { enforceFocus: boolean; breakActive: boolean; popupVisible: boolean },
) => {
  const window = getCurrentWindow();
  const full = options.popupVisible && overlayType === "fullscreen";
  await window.show();
  await window.unminimize();
  await window.setFocus();
  await window.setAlwaysOnTop(options.breakActive);
  await window.setFullscreen(full);
  await window.setClosable(!options.enforceFocus);
};

export const releaseOverlayWindow = async () => {
  const window = getCurrentWindow();
  await window.setClosable(true);
  await window.setFullscreen(false);
  await window.setAlwaysOnTop(false);
};

export const dismissOverlayWindow = async (liveInTray: boolean) => {
  const window = getCurrentWindow();
  await releaseOverlayWindow();
  await window.hide();
  if (!liveInTray) {
    await window.setAlwaysOnTop(false);
  }
};

export const reclaimOverlayFocus = async () => {
  const window = getCurrentWindow();
  await window.show();
  await window.unminimize();
  await window.setFocus();
};
