import { invoke } from "@tauri-apps/api/core";

export const pauseExternalMedia = async () => {
  try {
    return await invoke<boolean>("pause_external_media");
  } catch (error) {
    console.error("Failed to pause external media", error);
    return false;
  }
};

export const resumeExternalMedia = async () => {
  try {
    return await invoke<boolean>("resume_external_media");
  } catch (error) {
    console.error("Failed to resume external media", error);
    return false;
  }
};
