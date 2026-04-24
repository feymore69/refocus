import { CalendarClock, CheckCircle2, ShieldCheck, Target, Timer, Waves } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Segmented } from "../../components/ui/segmented";
import { Toggle } from "../../components/ui/toggle";
import { SCHEDULE_PRESETS } from "../../data/presets";
import { useAppStore } from "../../store/useAppStore";
import type { OnboardingGoal, OnboardingStep } from "../../types/settings";

const STEPS: OnboardingStep[] = ["goal", "preset", "strictness", "hours", "test"];

const stepIndex = (step: OnboardingStep) => STEPS.indexOf(step);

export const Onboarding = () => {
  const settings = useAppStore((s) => s.settings);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setOnboardingGoal = useAppStore((s) => s.setOnboardingGoal);
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateWeekdaySchedule = useAppStore((s) => s.updateWeekdaySchedule);
  const triggerReminder = useAppStore((s) => s.triggerReminder);

  const current = settings.onboardingStep;
  const index = stepIndex(current);
  const canNext = current !== "test";

  const title = useMemo(() => {
    if (current === "goal") return "What matters most?";
    if (current === "preset") return "Pick your starting rhythm";
    if (current === "strictness") return "How should reminders feel?";
    if (current === "hours") return "Set your working hours";
    return "Run a live test";
  }, [current]);

  const description = useMemo(() => {
    if (current === "goal") return "Refocus helps you protect your eyes, posture, and attention without breaking flow.";
    if (current === "preset") return "Start simple. You can fine-tune everything later.";
    if (current === "strictness") return "Choose gentle guidance or stricter break protection.";
    if (current === "hours") return "Only active work hours count toward break timing.";
    return "Test how your break popup behaves with your current settings.";
  }, [current]);

  const goNext = () => {
    if (!canNext) return;
    setOnboardingStep(STEPS[index + 1]);
  };

  const goBack = () => {
    if (index <= 0) return;
    setOnboardingStep(STEPS[index - 1]);
  };

  const renderGoalStep = () => (
    <div className="grid gap-2 md:grid-cols-2">
      {[
        { id: "eye-comfort", label: "Eye comfort", icon: Waves, copy: "Reduce eye strain with timely visual resets." },
        { id: "deep-work", label: "Deep work balance", icon: Target, copy: "Protect flow while avoiding overfocus fatigue." },
        { id: "posture", label: "Posture & movement", icon: ShieldCheck, copy: "Use breaks to reset shoulders and posture." },
        { id: "custom", label: "Custom", icon: CheckCircle2, copy: "You want full control from day one." },
      ].map((item) => {
        const selected = settings.onboardingGoal === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setOnboardingGoal(item.id as OnboardingGoal)}
            className={`rounded-xl border p-3 text-left transition ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-inner shadow-[var(--accent)]/20"
                : "border-white/15 bg-black/10 hover:bg-black/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[var(--accent)]" />
              <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{item.copy}</p>
          </button>
        );
      })}
    </div>
  );

  const renderPresetStep = () => (
    <div className="space-y-3">
      <div className="grid gap-2">
        {SCHEDULE_PRESETS.map((preset) => {
          const selected =
            settings.workIntervalMinutes === preset.intervalMinutes &&
            settings.breakDurationSeconds === preset.breakSeconds;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                updateSettings({
                  workIntervalMinutes: preset.intervalMinutes,
                  breakDurationSeconds: preset.breakSeconds,
                })
              }
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-inner shadow-[var(--accent)]/20"
                  : "border-white/15 bg-black/10 hover:bg-black/20"
              }`}
            >
              <p className="text-sm font-medium text-[var(--text)]">{preset.label}</p>
              <p className="text-xs text-[var(--muted)]">{preset.description}</p>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/15 bg-black/10 px-3 py-2">
          <p className="text-xs text-[var(--muted)]">Work interval</p>
          <p className="text-lg font-semibold text-[var(--text)]">{settings.workIntervalMinutes} min</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/10 px-3 py-2">
          <p className="text-xs text-[var(--muted)]">Micro break</p>
          <p className="text-lg font-semibold text-[var(--text)]">{settings.breakDurationSeconds} sec</p>
        </div>
      </div>
    </div>
  );

  const renderStrictnessStep = () => (
    <div className="space-y-3">
      <Segmented<"gentle" | "strict">
        value={settings.strictMode ? "strict" : "gentle"}
        onChange={(value) =>
          updateSettings({
            strictMode: value === "strict",
            reminderStyle: value === "strict" ? "normal" : "gentle",
          })
        }
        options={[
          { label: "Gentle", value: "gentle" },
          { label: "Strict", value: "strict" },
        ]}
      />
      <Toggle
        checked={settings.autoStartBreak}
        onChange={(value) => updateSettings({ autoStartBreak: value })}
        label="Auto-start break when due"
        description="If disabled, popup appears and you manually start the break."
      />
      <Toggle
        checked={settings.startOnBoot}
        onChange={(value) => updateSettings({ startOnBoot: value })}
        label="Launch on system startup"
      />
      <Toggle
        checked={settings.liveInTray}
        onChange={(value) => updateSettings({ liveInTray: value })}
        label="Stay in tray when closed"
      />
    </div>
  );

  const renderHoursStep = () => (
    <div className="space-y-3">
      <Toggle
        checked={settings.workingHoursEnabled}
        onChange={(value) => updateSettings({ workingHoursEnabled: value })}
        label="Only count work during office hours"
      />
      <div className="grid gap-2">
        {settings.weekdaySchedules.map((entry) => (
          <div key={entry.weekday} className="grid grid-cols-[72px_1fr_1fr_auto] items-center gap-2 rounded-xl border border-white/15 bg-black/10 p-2">
            <span className="text-xs text-[var(--muted)]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][entry.weekday]}</span>
            <input
              type="time"
              value={entry.start}
              onChange={(event) => updateWeekdaySchedule({ ...entry, start: event.target.value })}
              className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-[var(--text)]"
            />
            <input
              type="time"
              value={entry.end}
              onChange={(event) => updateWeekdaySchedule({ ...entry, end: event.target.value })}
              className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-[var(--text)]"
            />
            <button
              type="button"
              onClick={() => updateWeekdaySchedule({ ...entry, enabled: !entry.enabled })}
              className={`h-8 min-w-16 cursor-pointer rounded-lg border px-2 text-xs transition ${
                entry.enabled
                  ? "border-white/35 bg-white/20 text-[var(--text)]"
                  : "border-white/15 bg-black/20 text-[var(--muted)]"
              }`}
            >
              {entry.enabled ? "On" : "Off"}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">Overnight schedules are supported by setting end time earlier than start time.</p>
    </div>
  );

  const renderTestStep = () => (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/15 bg-black/10 p-3">
        <p className="text-sm text-[var(--text)]">Ready to go.</p>
        <p className="text-xs text-[var(--muted)]">Run one live popup so you know exactly how Refocus feels before finishing.</p>
      </div>
      <Button variant="secondary" onClick={() => triggerReminder(true)}>
        <Timer className="h-4 w-4" />
        Test popup
      </Button>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-wide text-[var(--muted)]">Refocus setup</p>
            <p className="text-xs text-[var(--muted)]">
              {index + 1} / {STEPS.length}
            </p>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">{title}</h1>
          <p className="text-sm text-[var(--muted)]">{description}</p>

          {current === "goal" ? renderGoalStep() : null}
          {current === "preset" ? renderPresetStep() : null}
          {current === "strictness" ? renderStrictnessStep() : null}
          {current === "hours" ? renderHoursStep() : null}
          {current === "test" ? renderTestStep() : null}
        </Card>

        <Card className="flex items-center justify-between">
          <Button variant="ghost" disabled={index === 0} onClick={goBack}>
            Back
          </Button>
          {current === "test" ? (
            <Button variant="primary" onClick={completeOnboarding}>
              <CalendarClock className="h-4 w-4" />
              Finish setup
            </Button>
          ) : (
            <Button variant="primary" onClick={goNext}>
              Continue
            </Button>
          )}
        </Card>
      </motion.div>
    </div>
  );
};
