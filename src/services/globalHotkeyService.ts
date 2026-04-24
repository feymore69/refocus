import { isRegistered, register, unregister } from "@tauri-apps/plugin-global-shortcut";

let currentHotkey: string | null = null;

export const registerBreakHotkey = async (accelerator: string, handler: () => void) => {
  try {
    if (currentHotkey && (await isRegistered(currentHotkey))) {
      await unregister(currentHotkey);
    }
    await register(accelerator, handler);
    currentHotkey = accelerator;
  } catch (error) {
    console.error("Failed to register global hotkey", error);
  }
};

export const clearGlobalHotkey = async () => {
  if (!currentHotkey) return;
  try {
    if (await isRegistered(currentHotkey)) {
      await unregister(currentHotkey);
    }
  } catch (error) {
    console.error("Failed to unregister global hotkey", error);
  } finally {
    currentHotkey = null;
  }
};
