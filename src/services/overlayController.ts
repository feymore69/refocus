import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { UserAttentionType, availableMonitors, getCurrentWindow } from "@tauri-apps/api/window";
import type { OverlayType } from "../types/settings";

interface WindowSnapshot {
  position: PhysicalPosition;
  size: PhysicalSize;
  maximized: boolean;
  fullscreen: boolean;
}

let snapshot: WindowSnapshot | null = null;
let overlaySessionActive = false;

const getVirtualDesktopBounds = async () => {
  const monitors = await availableMonitors();
  if (!monitors.length) return null;

  const left = Math.min(...monitors.map((monitor) => monitor.position.x));
  const top = Math.min(...monitors.map((monitor) => monitor.position.y));
  const right = Math.max(...monitors.map((monitor) => monitor.position.x + monitor.size.width));
  const bottom = Math.max(...monitors.map((monitor) => monitor.position.y + monitor.size.height));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

export const configureOverlayWindow = async (
  _overlayType: OverlayType,
  options: { enforceFocus: boolean; breakActive: boolean; popupVisible: boolean },
) => {
  const window = getCurrentWindow();

  if (!overlaySessionActive && options.popupVisible) {
    const [position, size, maximized, fullscreen] = await Promise.all([
      window.outerPosition(),
      window.outerSize(),
      window.isMaximized(),
      window.isFullscreen(),
    ]);
    snapshot = {
      position: new PhysicalPosition(position.x, position.y),
      size: new PhysicalSize(size.width, size.height),
      maximized,
      fullscreen,
    };
    overlaySessionActive = true;
  }

  const virtualBounds = await getVirtualDesktopBounds();

  await window.show();
  await window.unminimize();
  await window.setFocus();
  await window.setResizable(false);
  await window.setFullscreen(false);
  try {
    if (await window.isMaximized()) {
      await window.unmaximize();
    }
  } catch {
    // Continue even if maximize state cannot be queried on some desktops.
  }
  if (virtualBounds) {
    try {
      await window.setPosition(new PhysicalPosition(virtualBounds.x, virtualBounds.y));
      await window.setSize(new PhysicalSize(virtualBounds.width, virtualBounds.height));
    } catch {
      // Keep current position/size if desktop manager rejects spanning virtual bounds.
    }
  }
  try {
    await window.requestUserAttention(UserAttentionType.Critical);
  } catch {
    // Requesting attention can be unsupported on some platforms/window managers.
  }
  await window.setAlwaysOnTop(options.breakActive);
  await window.setClosable(!options.enforceFocus);
};

export const releaseOverlayWindow = async () => {
  const window = getCurrentWindow();

  try {
    await window.setClosable(true);
  } catch {}
  try {
    await window.setResizable(true);
  } catch {}
  try {
    await window.setFullscreen(false);
  } catch {}
  try {
    await window.setAlwaysOnTop(false);
  } catch {}

  if (snapshot) {
    try {
      await window.setPosition(new PhysicalPosition(snapshot.position.x, snapshot.position.y));
      await window.setSize(new PhysicalSize(snapshot.size.width, snapshot.size.height));
      if (snapshot.maximized) {
        await window.maximize();
      }
      if (snapshot.fullscreen) {
        await window.setFullscreen(true);
      }
    } catch {}
  }

  snapshot = null;
  overlaySessionActive = false;
};

export const dismissOverlayWindow = async (liveInTray: boolean) => {
  const window = getCurrentWindow();
  try {
    await releaseOverlayWindow();
  } finally {
    try {
      await window.hide();
    } catch {}
  }
  if (!liveInTray) {
    try {
      await window.setAlwaysOnTop(false);
    } catch {}
  }
};

export const reclaimOverlayFocus = async () => {
  const window = getCurrentWindow();
  await window.show();
  await window.unminimize();
  await window.setFocus();
};
