import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

export const notifyReminder = async (title: string, body: string) => {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }
  if (!permissionGranted) return;

  await sendNotification({ title, body });
};
