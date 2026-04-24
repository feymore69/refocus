import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

export const syncAutostart = async (wanted: boolean) => {
  try {
    const currentlyEnabled = await isEnabled();
    if (wanted && !currentlyEnabled) await enable();
    if (!wanted && currentlyEnabled) await disable();
  } catch (error) {
    console.error("Autostart sync failed", error);
  }
};
