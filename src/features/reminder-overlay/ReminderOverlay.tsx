import { CheckCircle2, ShieldAlert, SkipForward, TimerReset, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";
import { useAppStore } from "../../store/useAppStore";

const modeBackdrop: Record<string, string> = {
  chill: "from-cyan-300/25 via-sky-400/10 to-violet-400/25",
  focus: "from-slate-500/30 via-slate-700/20 to-slate-900/40",
  goblin: "from-fuchsia-500/35 via-rose-500/20 to-orange-400/30",
  custom: "from-[var(--accent)]/30 via-black/20 to-[var(--accent)]/15",
};

const styleFrame: Record<string, string> = {
  gentle: "bg-black/30 border-white/20",
  normal: "bg-black/35 border-white/25",
  chaotic: "bg-black/45 border-fuchsia-200/45 shadow-fuchsia-400/20",
};

const HOLD_TO_SKIP_MS = 1800;

export const ReminderOverlay = () => {
  const settings = useAppStore((s) => s.settings);
  const overlay = useAppStore((s) => s.overlay);
  const startBreakNow = useAppStore((s) => s.startBreakNow);
  const snoozeBreak = useAppStore((s) => s.snoozeBreak);
  const skipBreak = useAppStore((s) => s.skipBreak);
  const closeOverlay = useAppStore((s) => s.closeOverlay);

  const [nowMs, setNowMs] = useState(Date.now());
  const [skipHoldProgress, setSkipHoldProgress] = useState(0);
  const [emergencyConfirm, setEmergencyConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdFrameRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (overlay.phase !== "active" && overlay.phase !== "completing") return;

    let frame = 0;
    let fallbackInterval = 0;
    let active = true;

    const syncNow = () => {
      if (!active) return;
      setNowMs(Date.now());
    };

    const tick = () => {
      syncNow();
      frame = window.requestAnimationFrame(tick);
    };

    const handleVisibilityOrFocus = () => syncNow();

    syncNow();
    frame = window.requestAnimationFrame(tick);
    // Fallback when animation frames are throttled by the window manager.
    fallbackInterval = window.setInterval(syncNow, 120);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.clearInterval(fallbackInterval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [overlay.phase, overlay.startedAt, overlay.durationMs]);

  useEffect(() => {
    if (overlay.phase === "hidden") return;
    if (!containerRef.current) return;
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector)).filter(
      (item) => !item.hasAttribute("disabled"),
    );
    focusables[0]?.focus();
  }, [overlay.phase]);

  useEffect(() => {
    if (overlay.phase === "hidden") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;
      const selector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector)).filter(
        (item) => !item.hasAttribute("disabled"),
      );
      if (focusables.length <= 1) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlay.phase]);

  useEffect(() => {
    if (!emergencyConfirm) return;
    const timeout = window.setTimeout(() => setEmergencyConfirm(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [emergencyConfirm]);

  useEffect(() => {
    if (overlay.phase !== "completing") return;
    const timeout = window.setTimeout(() => {
      closeOverlay();
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [overlay.phase, closeOverlay]);

  const clearHold = () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (holdFrameRef.current) window.cancelAnimationFrame(holdFrameRef.current);
    holdTimerRef.current = null;
    holdFrameRef.current = null;
    holdStartRef.current = null;
    setSkipHoldProgress(0);
  };

  useEffect(() => clearHold, []);

  const executeSnooze = () => {
    snoozeBreak();
  };

  const executeSkip = (reason?: string) => {
    skipBreak(reason);
  };

  const startSkipHold = () => {
    if (!settings.strictMode) return;
    clearHold();
    holdStartRef.current = Date.now();
    const animate = () => {
      if (!holdStartRef.current) return;
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(1, elapsed / HOLD_TO_SKIP_MS);
      setSkipHoldProgress(progress);
      if (progress < 1) {
        holdFrameRef.current = window.requestAnimationFrame(animate);
      }
    };
    holdFrameRef.current = window.requestAnimationFrame(animate);
    holdTimerRef.current = window.setTimeout(() => {
      executeSkip("Skipped with enforced hold-to-skip");
      clearHold();
    }, HOLD_TO_SKIP_MS);
  };

  const stopSkipHold = () => {
    if (!settings.strictMode) return;
    clearHold();
  };

  const remainingMs = useMemo(() => {
    if (overlay.phase !== "active" || !overlay.startedAt) return overlay.durationMs;
    const elapsedMs = Math.max(0, nowMs - overlay.startedAt);
    return Math.max(0, overlay.durationMs - elapsedMs);
  }, [nowMs, overlay.durationMs, overlay.phase, overlay.startedAt]);

  const ringProgress = overlay.phase === "active" ? Math.max(0, remainingMs / Math.max(1, overlay.durationMs)) : 1;
  const remainingDisplay =
    overlay.phase === "active" ? Math.max(0, Math.ceil(remainingMs / 1000)) : overlay.remainingSeconds;

  const ringDegrees = Math.max(0, Math.min(360, ringProgress * 360));

  const isEnforced = settings.strictMode;
  const completionVisible = overlay.phase === "completing";

  return (
    <AnimatePresence>
      {overlay.phase !== "hidden" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md",
            isEnforced && "bg-black/70 backdrop-blur-lg",
          )}
        >
          <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", modeBackdrop[settings.mode])} />
          <motion.div
            ref={containerRef}
            initial={{ y: settings.reducedMotion ? 0 : 24, scale: settings.reducedMotion ? 1 : 0.985 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className={cn(
              "relative z-10 w-full max-w-xl rounded-3xl border p-6 text-white shadow-2xl backdrop-blur-xl",
              styleFrame[settings.reminderStyle],
              settings.overlayType === "fullscreen" && "max-w-3xl p-10",
              isEnforced && "border-white/35 shadow-white/10",
            )}
            role="dialog"
            aria-modal
            aria-live="assertive"
          >
            <p className="text-xs uppercase tracking-wide text-white/70">Refocus break</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
              {completionVisible ? "Break complete" : overlay.message || "Time for a break."}
            </h2>
            <p className="mt-2 text-sm text-white/85">
              {completionVisible
                ? "Nice reset. Returning you to your workflow."
                : overlay.subMessage || "Look away, blink slowly, and reset your posture."}
            </p>
            {!completionVisible ? <p className="mt-1 text-xs text-white/65">Break mode is active on every connected display.</p> : null}

            {isEnforced && !completionVisible ? (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-1 text-xs text-white/90">
                <ShieldAlert className="h-3.5 w-3.5" />
                Enforced break mode: harder to dismiss
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-white/10 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-white/70">
                {overlay.phase === "prompt" ? "Break length" : completionVisible ? "Done" : "Remaining"}
              </p>
              <div className="mt-2 flex items-center justify-center gap-4">
                <div className="relative h-16 w-16">
                  <div
                    className="absolute inset-0 rounded-full p-1"
                    aria-hidden
                    style={{
                      background: `conic-gradient(from -90deg, rgba(255,255,255,0.96) 0deg ${ringDegrees}deg, rgba(255,255,255,0.2) ${ringDegrees}deg 360deg)`,
                    }}
                  >
                    <div className="h-full w-full rounded-full bg-[rgba(9,15,33,0.88)] ring-1 ring-white/12" />
                  </div>
                  {completionVisible ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 rounded-full ring-1 ring-white/10" />
                  )}
                </div>
                {completionVisible ? (
                  <p className="text-2xl font-semibold text-emerald-100">Done</p>
                ) : (
                  <p className="text-5xl font-semibold tabular-nums">{remainingDisplay}s</p>
                )}
              </div>
              {!completionVisible && overlay.phase === "active" ? (
                <p className="mt-1 text-xs text-white/70">Progress: {Math.round(ringProgress * 100)}%</p>
              ) : null}
            </div>

            {!completionVisible ? (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {overlay.phase === "prompt" ? (
                  <Button variant="primary" onClick={startBreakNow}>
                    <Zap className="h-4 w-4" />
                    Start break
                  </Button>
                ) : null}
                <Button variant={isEnforced ? "ghost" : "secondary"} onClick={executeSnooze}>
                  <TimerReset className="h-4 w-4" />
                  Snooze
                </Button>
                {isEnforced ? (
                  <button
                    type="button"
                    onMouseDown={startSkipHold}
                    onMouseUp={stopSkipHold}
                    onMouseLeave={stopSkipHold}
                    onTouchStart={startSkipHold}
                    onTouchEnd={stopSkipHold}
                    className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-white/20"
                      style={{ width: `${Math.round(skipHoldProgress * 100)}%` }}
                    />
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <SkipForward className="h-4 w-4" />
                      Hold to skip
                    </span>
                  </button>
                ) : (
                  <Button variant="ghost" onClick={() => executeSkip()}>
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                )}
              </div>
            ) : null}

            {isEnforced && !completionVisible ? (
              <div className="mt-4">
                {!emergencyConfirm ? (
                  <button
                    type="button"
                    onClick={() => setEmergencyConfirm(true)}
                    className="text-xs text-white/65 underline decoration-white/30 underline-offset-4 hover:text-white/85"
                  >
                    Emergency dismiss
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEmergencyConfirm(false);
                      closeOverlay();
                    }}
                    className="text-xs text-amber-200 underline decoration-amber-200/50 underline-offset-4"
                  >
                    Confirm emergency dismiss
                  </button>
                )}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
