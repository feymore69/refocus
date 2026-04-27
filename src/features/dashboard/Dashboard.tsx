import { Pause, Play, Sparkle, Timer } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { SCHEDULE_PRESETS } from "../../data/presets";
import { msToCountdown } from "../../lib/time";
import { useAppStore } from "../../store/useAppStore";

export const Dashboard = () => {
  const settings = useAppStore((s) => s.settings);
  const session = useAppStore((s) => s.session);
  const clockMs = useAppStore((s) => s.clockMs);
  const stats = useAppStore((s) => s.stats);
  const pauseReminders = useAppStore((s) => s.pauseReminders);
  const resumeReminders = useAppStore((s) => s.resumeReminders);
  const triggerReminder = useAppStore((s) => s.triggerReminder);

  const msLeft = Math.max(0, session.nextBreakAt - clockMs);
  const totalDecisions = stats.breaksTakenToday + stats.breaksSkippedToday;
  const weeklyAverage =
    stats.weeklyAdherence.length > 0
      ? Math.round(stats.weeklyAdherence.reduce((sum, value) => sum + value, 0) / stats.weeklyAdherence.length)
      : 0;
  const activePreset =
    SCHEDULE_PRESETS.find(
      (preset) => preset.intervalMinutes === settings.workIntervalMinutes && preset.breakSeconds === settings.breakDurationSeconds,
    ) ?? null;
  const trendPoints = stats.weeklyAdherence.map((value, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const label = date.toLocaleDateString([], { weekday: "short" });
    return { value, label };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="h-full lg:col-span-2">
        <div className="flex min-h-[19rem] flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Next break</p>
              <p className="mt-0.5 text-[5.5rem] leading-none font-semibold text-[var(--text)] tabular-nums">
                {msToCountdown(msLeft)}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Refocus schedules smart screen breaks around your work rhythm so you can reset your eyes without
                losing momentum.
              </p>
            </div>
            <motion.div
              animate={{ rotate: settings.reminderStyle === "chaotic" ? [0, -2, 2, 0] : 0 }}
              transition={{ duration: 0.8, repeat: settings.reminderStyle === "chaotic" ? Infinity : 0 }}
              className="rounded-2xl bg-[var(--accent)]/20 p-3 text-[var(--accent)]"
            >
              <Timer className="h-6 w-6" />
            </motion.div>
          </div>
          <div className="mt-auto flex flex-col justify-end pt-6">
            {session.isPaused ? (
              <p className="mb-3 text-sm text-amber-300">Reminders paused</p>
            ) : (
              <p className="mb-3 text-sm text-[var(--muted)]">Your next reset will appear automatically when the timer ends.</p>
            )}
            <div className="border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-end gap-2">
                <Button variant="primary" onClick={() => triggerReminder(true)}>
                  <Sparkle className="h-4 w-4" />
                  Start break now
                </Button>
                {session.isPaused ? (
                  <Button onClick={resumeReminders}>
                    <Play className="h-4 w-4" />
                    Resume schedule
                  </Button>
                ) : (
                  <Button onClick={() => pauseReminders("30m")}>
                    <Pause className="h-4 w-4" />
                    Pause 30 min
                  </Button>
                )}
                <Button variant="secondary" onClick={() => pauseReminders("today")}>
                  Pause until tomorrow
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="h-full">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Today</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-[var(--muted)]">Focused time</p>
            <p className="text-lg font-semibold text-[var(--text)]">{Math.max(0, stats.activeMinutesToday)} min</p>
          </div>
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-[var(--muted)]">Adherence</p>
            <p className="text-lg font-semibold text-[var(--text)]">{stats.adherenceRateToday}%</p>
          </div>
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-[var(--muted)]">Taken / skipped</p>
            <p className="text-lg font-semibold text-[var(--text)]">
              {stats.breaksTakenToday} / {stats.breaksSkippedToday}
            </p>
          </div>
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-[var(--muted)]">Longest streak</p>
            <p className="text-lg font-semibold text-[var(--text)]">{stats.longestFocusStreakMinutes} min</p>
          </div>
        </div>
        {totalDecisions === 0 ? (
          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
            Start your first focus cycle. Adherence is calculated as completed breaks divided by completed + skipped breaks.
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
            Adherence = breaks completed / (completed + skipped). Snoozed breaks are tracked separately and do not lower adherence.
          </div>
        )}
      </Card>

      <Card className="lg:col-span-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Preset</p>
            <p className="text-sm font-medium text-[var(--text)]">{activePreset?.label ?? "Custom schedule"}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Smart Pause</p>
            <p className="text-sm font-medium text-[var(--text)]">
              {settings.smartPause.activityDetectionEnabled ? "Active" : "Disabled"}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Working hours</p>
            <p className="text-sm font-medium text-[var(--text)]">
              {settings.workingHoursEnabled ? "Only during schedule" : "All day"}
            </p>
          </div>
        </div>
      </Card>

      {settings.statsWeeklyTrendEnabled ? (
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Weekly trend</p>
            <p className="text-sm text-[var(--text)]">
              Average adherence: <span className="font-semibold">{weeklyAverage}%</span>
            </p>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {trendPoints.map((point, index) => (
              <div key={`${index}-${point.value}`} className="space-y-1">
                <div
                  className="h-24 rounded-lg border border-white/10 bg-black/15 p-1"
                  title={`${point.label}: ${point.value}% adherence`}
                >
                  <div className="flex h-full flex-col justify-end rounded-md bg-black/20 p-1">
                    <div className="rounded-sm bg-[var(--accent)]/70" style={{ height: `${Math.max(6, point.value)}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                  <span>{point.label}</span>
                  <span>{point.value}%</span>
                </div>
              </div>
            ))}
          </div>
          {stats.history.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              No history yet. This chart fills as you complete or skip breaks through the week.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
};
