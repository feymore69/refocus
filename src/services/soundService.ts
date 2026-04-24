interface CueOptions {
  enabled: boolean;
  volume: number;
}

interface CueTone {
  frequency: number;
  delayMs: number;
  durationMs: number;
  type?: OscillatorType;
  gainScale?: number;
}

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (sharedAudioContext) return sharedAudioContext;

  try {
    const ContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ContextCtor) return null;

    sharedAudioContext = new ContextCtor();
    return sharedAudioContext;
  } catch (error) {
    console.error("Audio context unavailable", error);
    return null;
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const playToneSequence = async (tones: CueTone[], options: CueOptions) => {
  if (!options.enabled || tones.length === 0) return;
  const context = getAudioContext();
  if (!context) return;
  try {
    if (context.state === "suspended") {
      await context.resume();
    }
    const baseGain = clamp(options.volume / 100, 0, 1) * 0.14;
    const anchor = context.currentTime;
    tones.forEach((tone) => {
      const gainNode = context.createGain();
      const oscillator = context.createOscillator();
      const startTime = anchor + tone.delayMs / 1000;
      const endTime = startTime + tone.durationMs / 1000;

      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.value = tone.frequency;
      gainNode.gain.value = baseGain * (tone.gainScale ?? 1);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  } catch (error) {
    console.error("Failed to play cue", error);
  }
};

export const playReminderCue = async (options: CueOptions) =>
  playToneSequence(
    [
      { frequency: 880, delayMs: 0, durationMs: 130, type: "sine", gainScale: 1 },
      { frequency: 1040, delayMs: 140, durationMs: 80, type: "triangle", gainScale: 0.85 },
    ],
    options,
  );

export const playBreakCompleteCue = async (options: CueOptions) =>
  playToneSequence(
    [
      { frequency: 620, delayMs: 0, durationMs: 120, type: "triangle", gainScale: 0.9 },
      { frequency: 930, delayMs: 140, durationMs: 180, type: "triangle", gainScale: 1 },
    ],
    options,
  );
