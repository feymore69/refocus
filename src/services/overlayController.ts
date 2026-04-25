import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import {
  UserAttentionType,
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
  primaryMonitor,
} from "@tauri-apps/api/window";
import type { OverlayType } from "../types/settings";

interface WindowSnapshot {
  position: PhysicalPosition;
  size: PhysicalSize;
  maximized: boolean;
  fullscreen: boolean;
  decorated: boolean;
}

let snapshot: WindowSnapshot | null = null;
let overlaySessionActive = false;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

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
  overlayType: OverlayType,
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
    const decorated = await window.isDecorated();
    snapshot = {
      position: new PhysicalPosition(position.x, position.y),
      size: new PhysicalSize(size.width, size.height),
      maximized,
      fullscreen,
      decorated,
    };
    overlaySessionActive = true;
  }

  const virtualBounds = await getVirtualDesktopBounds();

  await window.show();
  await window.unminimize();
  await window.setFocus();
  await window.setResizable(false);

  if (overlayType === "fullscreen") {
    try {
      await window.setDecorations(false);
    } catch {
      // Continue even if decoration control is unavailable.
    }
    try {
      if (await window.isMaximized()) {
        await window.unmaximize();
      }
    } catch {
      // Continue if maximize state can't be queried.
    }
    const targetMonitor = (await currentMonitor()) ?? (await primaryMonitor());
    if (targetMonitor) {
      try {
        await window.setPosition(new PhysicalPosition(targetMonitor.position.x, targetMonitor.position.y));
        await window.setSize(new PhysicalSize(targetMonitor.size.width, targetMonitor.size.height));
      } catch {
        // Continue if monitor positioning is rejected by the window manager.
      }
    }
    try {
      await window.setSimpleFullscreen(true);
    } catch {
      // setSimpleFullscreen maps to fullscreen on Windows/Linux; ignore if unsupported.
    }
    if (!(await window.isFullscreen().catch(() => false))) {
      await wait(40);
    }
    try {
      await window.setFullscreen(true);
    } catch {
      // Fall back to a sized window if fullscreen is unsupported.
    }
    if (!(await window.isFullscreen().catch(() => false))) {
      try {
        await window.maximize();
      } catch {
        // Final fallback if fullscreen is blocked by the window manager.
      }
    }
  } else {
    await window.setFullscreen(false);
    try {
      await window.setDecorations(true);
    } catch {
      // Continue even if decoration control is unavailable.
    }
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
    await window.setDecorations(snapshot?.decorated ?? true);
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
        await window.setSimpleFullscreen(true);
      }
      if (!snapshot.fullscreen && snapshot.decorated) {
        await window.setDecorations(true);
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
