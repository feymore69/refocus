export const secondsToLabel = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
};

export const msToCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

export const pauseOptionToMs = (option: "1m" | "5m" | "15m" | "30m" | "1h" | "today" | "tomorrow") => {
  if (option === "1m") return 60_000;
  if (option === "5m") return 5 * 60_000;
  if (option === "15m") return 15 * 60_000;
  if (option === "30m") return 30 * 60_000;
  if (option === "1h") return 60 * 60_000;
  if (option === "tomorrow") {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime() - now.getTime();
};
