import { useEffect, useMemo, useState } from "react";
import { Bell, BrainCircuit, Palette, ShieldCheck, SlidersHorizontal, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SCHEDULE_PRESETS } from "../../data/presets";
import { THEMES } from "../../data/themes";
import { useAppStore } from "../../store/useAppStore";
import type { AppSettings, CustomBreakLine, OverlayType, WeekdaySchedule } from "../../types/settings";
import { playReminderCue } from "../../services/soundService";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Range } from "../../components/ui/range";
import { Segmented } from "../../components/ui/segmented";
import { SettingHint } from "../../components/ui/setting-hint";
import { Toggle } from "../../components/ui/toggle";

type SettingsSection = "essentials" | "smart-pause" | "break-experience" | "data-privacy" | "appearance";

const overlayOptions: { label: string; value: OverlayType }[] = [
  { label: "Full", value: "fullscreen" },
  { label: "Modal", value: "modal" },
];

const sectionItems: { id: SettingsSection; label: string }[] = [
  { id: "essentials", label: "Essentials" },
  { id: "smart-pause", label: "Smart Pause" },
  { id: "break-experience", label: "Break Experience" },
  { id: "data-privacy", label: "Data & Privacy" },
  { id: "appearance", label: "Appearance" },
];

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_PREVIEW_LINES: CustomBreakLine[] = [
  { title: "Time for a focused break.", description: "Look 20 feet away and relax your focus." },
  { title: "Reset your posture.", description: "Drop your shoulders and unclench your hands." },
  { title: "Blink and recover.", description: "Blink slowly and let your eyes reset." },
];

export const SettingsView = () => {
  const settings = useAppStore((s) => s.settings);
  const stats = useAppStore((s) => s.stats);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateWeekdaySchedule = useAppStore((s) => s.updateWeekdaySchedule);
  const triggerReminder = useAppStore((s) => s.triggerReminder);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const [activeSection, setActiveSection] = useState<SettingsSection>("essentials");
  const [customTitleInput, setCustomTitleInput] = useState("");
  const [customDescriptionInput, setCustomDescriptionInput] = useState("");
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState<CustomBreakLine | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const applySettingsPatch = (patch: Partial<AppSettings>) => {
    updateSettings(patch);
  };

  const applySmartPausePatch = (patch: Partial<AppSettings["smartPause"]>) => {
    updateSettings({ smartPause: { ...settings.smartPause, ...patch } });
  };

  const selectedPreset = useMemo(
    () =>
      SCHEDULE_PRESETS.find(
        (item) => item.intervalMinutes === settings.workIntervalMinutes && item.breakSeconds === settings.breakDurationSeconds,
      ) ?? null,
    [settings.breakDurationSeconds, settings.workIntervalMinutes],
  );

  const updateMessage = (index: number, value: CustomBreakLine) => {
    const title = value.title.trim();
    const description = value.description.trim();
    if (!title || !description) return;
    applySettingsPatch({
      customMessages: settings.customMessages.map((item, itemIndex) =>
        itemIndex === index ? { title, description } : item,
      ),
    });
    setEditingMessageIndex(null);
    setEditingMessageValue(null);
  };

  const resetToPresetDefaults = () => {
    if (!selectedPreset) return;
    applySettingsPatch({
      workIntervalMinutes: selectedPreset.intervalMinutes,
      breakDurationSeconds: selectedPreset.breakSeconds,
      snoozeMinutes: 5,
      autoStartBreak: true,
      autoRepeat: true,
    });
  };

  const toggleLongBreak = (checked: boolean) => {
    applySettingsPatch({
      breakTierSettings: {
        ...settings.breakTierSettings,
        enabledTiers: checked ? ["micro", "long"] : ["micro"],
      },
    });
  };

  const playSoundPreview = () => {
    void playReminderCue({ enabled: settings.soundEnabled, volume: settings.soundVolume });
  };

  const applyWeekdayBatch = (weekdays: WeekdaySchedule["weekday"][], patch: Partial<WeekdaySchedule>) => {
    settings.weekdaySchedules.forEach((entry) => {
      if (weekdays.includes(entry.weekday)) {
        updateWeekdaySchedule({ ...entry, ...patch });
      }
    });
  };

  const copyMondayToWeekdays = () => {
    const monday = settings.weekdaySchedules.find((item) => item.weekday === 1);
    if (!monday) return;
    settings.weekdaySchedules.forEach((entry) => {
      if (entry.weekday >= 1 && entry.weekday <= 5) {
        updateWeekdaySchedule({
          ...entry,
          start: monday.start,
          end: monday.end,
          enabled: monday.enabled,
        });
      }
    });
  };

  const previewLines = settings.customMessages.length > 0 ? settings.customMessages : DEFAULT_PREVIEW_LINES;
  const activePreviewLine = previewLines[previewIndex % previewLines.length];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPreviewIndex((current) => (current + 1) % Math.max(1, previewLines.length));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [previewLines.length]);

  const historyCount = stats.history.length;
  const firstHistoryAt = historyCount > 0 ? Math.min(...stats.history.map((item) => item.actualTimestamp ?? item.timestamp)) : null;
  const lastHistoryAt = historyCount > 0 ? Math.max(...stats.history.map((item) => item.actualTimestamp ?? item.timestamp)) : null;
  const smartPauseEnabled = settings.smartPause.activityDetectionEnabled;
  const workingHoursEnabled = settings.workingHoursEnabled;
  const longTierEnabled = settings.breakTierSettings.enabledTiers.includes("long");

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2">
          {sectionItems.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`cursor-pointer rounded-xl border px-3 py-1.5 text-sm transition ${
                activeSection === section.id
                  ? "border-white/35 bg-white/20 text-[var(--text)] shadow-inner shadow-white/15"
                  : "border-white/15 bg-black/10 text-[var(--muted)] hover:bg-black/20"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </Card>

      {activeSection === "essentials" ? (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[var(--text)]">
            <SlidersHorizontal className="h-4 w-4" />
            <h3 className="text-sm font-medium">Essentials</h3>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Configure your daily rhythm in under a minute. These are the controls you will use most often.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {SCHEDULE_PRESETS.map((preset) => {
              const selected =
                settings.workIntervalMinutes === preset.intervalMinutes &&
                settings.breakDurationSeconds === preset.breakSeconds;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    applySettingsPatch({
                      workIntervalMinutes: preset.intervalMinutes,
                      breakDurationSeconds: preset.breakSeconds,
                    })
                  }
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                    selected
                      ? "border-white/35 bg-white/20 text-[var(--text)] shadow-inner shadow-white/15"
                      : "border-white/20 bg-black/10 text-[var(--text)] hover:bg-black/20"
                  }`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Range
              label="Work interval"
              helpText="Focused work time before a break becomes due."
              min={5}
              max={90}
              step={5}
              value={settings.workIntervalMinutes}
              unit="m"
              onChange={(value) => applySettingsPatch({ workIntervalMinutes: value })}
            />
            <Range
              label="Micro break duration"
              helpText="Length of your standard visual break."
              min={15}
              max={180}
              step={5}
              value={settings.breakDurationSeconds}
              unit="s"
              onChange={(value) => applySettingsPatch({ breakDurationSeconds: value })}
            />
            <Range
              label="Snooze duration"
              helpText="Delay applied when you snooze from the popup."
              min={1}
              max={30}
              step={1}
              value={settings.snoozeMinutes}
              unit="m"
              onChange={(value) => applySettingsPatch({ snoozeMinutes: value })}
            />
            <div className="rounded-xl border border-white/15 bg-black/10 px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Current preset</p>
              <p className="text-sm font-medium text-[var(--text)]">{selectedPreset?.label ?? "Custom schedule"}</p>
              <p className="text-xs text-[var(--muted)]">
                {selectedPreset?.description ?? "You are using custom timing values."}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={resetToPresetDefaults} disabled={!selectedPreset}>
              Reset to preset defaults
            </Button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Toggle
              checked={settings.autoStartBreak}
              onChange={(value) => applySettingsPatch({ autoStartBreak: value })}
              label="Auto-start break"
              helpText="Start the break countdown immediately when time is up."
            />
            <Toggle
              checked={settings.autoRepeat}
              onChange={(value) => applySettingsPatch({ autoRepeat: value })}
              label="Auto-start next cycle"
              helpText="Begin the next work interval after a completed break."
            />
            <Toggle
              checked={settings.startOnBoot}
              onChange={(value) => applySettingsPatch({ startOnBoot: value })}
              label="Launch on system startup"
              helpText="Open Refocus automatically after login."
            />
            <Toggle
              checked={settings.liveInTray}
              onChange={(value) => applySettingsPatch({ liveInTray: value })}
              label="Stay in tray when closed"
              helpText="Keep tracking in the background when window closes."
            />
            <Toggle
              checked={settings.workingHoursEnabled}
              onChange={(value) => applySettingsPatch({ workingHoursEnabled: value })}
              label="Only interrupt me during working hours"
              helpText="Disable reminders outside your active schedule."
            />
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--text)]">Weekday schedule</p>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={copyMondayToWeekdays}
                  disabled={!workingHoursEnabled}
                >
                  Copy Mon to weekdays
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => applyWeekdayBatch([0, 6], { enabled: false })}
                  disabled={!workingHoursEnabled}
                >
                  Disable weekends
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() =>
                    applyWeekdayBatch([0, 1, 2, 3, 4, 5, 6], {
                      enabled: true,
                      start: "00:00",
                      end: "23:59",
                    })
                  }
                  disabled={!workingHoursEnabled}
                >
                  Reset all day
                </Button>
              </div>
            </div>
            <div className={`grid gap-2 ${!workingHoursEnabled ? "opacity-50" : ""}`}>
              {settings.weekdaySchedules.map((entry) => (
                <div
                  key={entry.weekday}
                  className="grid grid-cols-[56px_1fr_1fr_auto] items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2"
                >
                  <span className="text-xs text-[var(--muted)]">{weekdayLabels[entry.weekday]}</span>
                  <input
                    type="time"
                    value={entry.start}
                    onChange={(event) =>
                      updateWeekdaySchedule({ ...entry, start: event.target.value } as WeekdaySchedule)
                    }
                    disabled={!workingHoursEnabled}
                    className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-[var(--text)]"
                  />
                  <input
                    type="time"
                    value={entry.end}
                    onChange={(event) => updateWeekdaySchedule({ ...entry, end: event.target.value } as WeekdaySchedule)}
                    disabled={!workingHoursEnabled}
                    className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-[var(--text)]"
                  />
                  <button
                    type="button"
                    onClick={() => updateWeekdaySchedule({ ...entry, enabled: !entry.enabled } as WeekdaySchedule)}
                    disabled={!workingHoursEnabled}
                    className={`h-8 min-w-16 cursor-pointer rounded-lg border px-2 text-xs transition ${
                      entry.enabled
                        ? "border-white/35 bg-white/20 text-[var(--text)]"
                        : "border-white/15 bg-black/20 text-[var(--muted)]"
                    }`}
                  >
                    {entry.enabled ? "Enabled" : "Off"}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Overnight shifts are supported. Set an end time earlier than the start time.
            </p>
          </div>
        </Card>
      ) : null}

      {activeSection === "smart-pause" ? (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[var(--text)]">
            <BrainCircuit className="h-4 w-4" />
            <h3 className="text-sm font-medium">Smart Pause</h3>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Reduce interruptions at bad moments. Smart Pause delays reminders during active interaction or constrained contexts.
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            <Toggle
              checked={settings.smartPause.activityDetectionEnabled}
              onChange={(value) => applySmartPausePatch({ activityDetectionEnabled: value })}
              label="Enable local activity detection"
              helpText="Uses local activity signals only to time reminders more intelligently."
            />
            <Toggle
              checked={settings.smartPause.idleDetectionEnabled}
              onChange={(value) => applySmartPausePatch({ idleDetectionEnabled: value })}
              label="Pause timer while idle"
              helpText="Only count active desk time toward work intervals."
              disabled={!smartPauseEnabled}
            />
            <Range
              label="Idle threshold"
              helpText="How long without interaction before timer pauses."
              min={20}
              max={300}
              step={5}
              value={settings.smartPause.idleThresholdSeconds}
              unit="s"
              onChange={(value) => applySmartPausePatch({ idleThresholdSeconds: value })}
              disabled={!smartPauseEnabled || !settings.smartPause.idleDetectionEnabled}
            />
            <Toggle
              checked={settings.smartPause.typingAwareDeferralEnabled}
              onChange={(value) => applySmartPausePatch({ typingAwareDeferralEnabled: value })}
              label="Delay reminders while I'm actively typing"
              helpText="If break is due mid-flow, wait briefly after typing stops."
              disabled={!smartPauseEnabled}
            />
            <Range
              label="Typing delay"
              helpText="Delay before showing a due reminder after interaction stops."
              min={5}
              max={90}
              step={1}
              value={settings.smartPause.typingDeferralSeconds}
              unit="s"
              onChange={(value) => applySmartPausePatch({ typingDeferralSeconds: value })}
              disabled={!smartPauseEnabled || !settings.smartPause.typingAwareDeferralEnabled}
            />
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-sm font-medium text-[var(--text)]">Current Smart Pause status</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
              <li>
                {settings.smartPause.activityDetectionEnabled
                  ? "Activity detection is active."
                  : "Activity detection is disabled."}
              </li>
              <li>
                {settings.smartPause.typingAwareDeferralEnabled
                  ? "Reminders will delay briefly while you are typing."
                  : "Typing-aware delay is off."}
              </li>
              <li>
                {settings.smartPause.idleDetectionEnabled
                  ? `Idle threshold is ${settings.smartPause.idleThresholdSeconds} seconds.`
                  : "Idle detection is off."}
              </li>
            </ul>
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
            Smart Pause uses local reminder state and app interaction timestamps only. Refocus does not record keystroke content,
            screen contents, clipboard contents, or work files.
          </div>
        </Card>
      ) : null}

      {activeSection === "break-experience" ? (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[var(--text)]">
            <Bell className="h-4 w-4" />
            <h3 className="text-sm font-medium">Break Experience</h3>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Shape how breaks feel and what guidance appears during each interruption.
          </p>
          <div className="mb-3 rounded-xl border border-white/15 bg-black/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-white/70">Break popup configuration</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => triggerReminder(true)}>
                  Test break popup
                </Button>
                <Button variant="secondary" disabled={!settings.soundEnabled} onClick={playSoundPreview}>
                  <Volume2 className="h-4 w-4" />
                  Test sound
                </Button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activePreviewLine.title}-${activePreviewLine.description}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <h4 className="mt-1 text-lg font-semibold text-[var(--text)]">{activePreviewLine.title}</h4>
                <p className="mt-1 text-sm text-[var(--muted)]">{activePreviewLine.description}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
              <p>Overlay: {settings.overlayType === "fullscreen" ? "Full-screen" : "Modal"}</p>
              <p>Sound: {settings.soundEnabled ? `On (${settings.soundVolume}%)` : "Off"}</p>
              <p>
                Media during break:{" "}
                {settings.pauseExternalMediaDuringBreak ? "Pause and resume automatically" : "No media control"}
              </p>
              <p>{settings.autoStartBreak ? "Break starts automatically when due." : "Break waits for manual start."}</p>
              <p>{settings.customMessages.length > 0 ? "Using custom break lines only." : "Using Refocus default break lines."}</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="mb-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                Overlay type
                <SettingHint text="Choose modal popup or full-screen break takeover." />
              </p>
              <Segmented<OverlayType>
                value={settings.overlayType}
                onChange={(overlayType) => applySettingsPatch({ overlayType })}
                options={overlayOptions}
              />
            </div>
            <Toggle
              checked={settings.strictMode}
              onChange={(value) => applySettingsPatch({ strictMode: value })}
              label="Enforced break mode"
              helpText="Makes breaks harder to dismiss with focus lock and hold-to-skip protection."
            />
            <Toggle
              checked={settings.soundEnabled}
              onChange={(value) => applySettingsPatch({ soundEnabled: value })}
              label="Reminder sound"
              helpText="Play short cues when a break starts and when it ends."
            />
            <Toggle
              checked={settings.pauseExternalMediaDuringBreak}
              onChange={(value) => applySettingsPatch({ pauseExternalMediaDuringBreak: value })}
              label="Pause external media during breaks"
              helpText="Best effort: pause currently playing audio/video when a break starts, then resume after the popup closes."
            />
            <div className="md:col-span-2">
              <Range
                label="Sound volume"
                helpText="Playback level for break sound cues."
                min={0}
                max={100}
                value={settings.soundVolume}
                unit="%"
                onChange={(value) => applySettingsPatch({ soundVolume: value })}
                disabled={!settings.soundEnabled}
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-sm font-medium text-[var(--text)]">Break tiers</p>
            <p className="text-xs text-[var(--muted)]">
              Standard breaks use your main interval and break duration. Configure optional long breaks below.
            </p>
            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <Toggle checked={longTierEnabled} onChange={toggleLongBreak} label="Enable long breaks" />
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <Range
                  label="Long break every"
                  helpText="After how many work cycles to run a long break."
                  min={4}
                  max={20}
                  step={1}
                  value={settings.breakTierSettings.longBreakEvery}
                  unit="cycles"
                  onChange={(value) =>
                    applySettingsPatch({
                      breakTierSettings: { ...settings.breakTierSettings, longBreakEvery: value },
                    })
                  }
                  disabled={!longTierEnabled}
                />
                <Range
                  label="Long break length"
                  helpText="Duration of long breaks."
                  min={10}
                  max={20}
                  step={1}
                  value={settings.breakTierSettings.longBreakMinutes}
                  unit="m"
                  onChange={(value) =>
                    applySettingsPatch({
                      breakTierSettings: { ...settings.breakTierSettings, longBreakMinutes: value },
                    })
                  }
                  disabled={!longTierEnabled}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-sm font-medium text-[var(--text)]">Custom break lines</p>
            <p className="text-xs text-[var(--muted)]">
              These rotate with default break headlines. Keep lines short, action-focused, and free of sensitive information.
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input
                value={customTitleInput}
                onChange={(event) => setCustomTitleInput(event.target.value)}
                placeholder="Break title"
                className="w-full rounded-lg border border-white/20 bg-black/20 px-2 py-1.5 text-sm text-[var(--text)]"
              />
              <input
                value={customDescriptionInput}
                onChange={(event) => setCustomDescriptionInput(event.target.value)}
                placeholder="Break description"
                className="w-full rounded-lg border border-white/20 bg-black/20 px-2 py-1.5 text-sm text-[var(--text)]"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={() => {
                  const title = customTitleInput.trim();
                  const description = customDescriptionInput.trim();
                  if (!title || !description) return;
                  applySettingsPatch({ customMessages: [...settings.customMessages, { title, description }] });
                  setCustomTitleInput("");
                  setCustomDescriptionInput("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {settings.customMessages.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No custom lines yet.</p>
              ) : (
                settings.customMessages.map((message, index) => (
                  <div key={`${message}-${index}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                    {editingMessageIndex === index ? (
                      <div className="grid w-full gap-2 md:grid-cols-2">
                        <label className="text-xs text-[var(--muted)]">
                          Title
                          <input
                            value={editingMessageValue?.title ?? ""}
                            onChange={(event) =>
                              setEditingMessageValue((current) => ({ title: event.target.value, description: current?.description ?? "" }))
                            }
                            className="mt-1 w-full rounded border border-white/20 bg-black/20 px-2 py-1 text-sm text-[var(--text)]"
                          />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                          Description
                          <input
                            value={editingMessageValue?.description ?? ""}
                            onChange={(event) =>
                              setEditingMessageValue((current) => ({ title: current?.title ?? "", description: event.target.value }))
                            }
                            className="mt-1 w-full rounded border border-white/20 bg-black/20 px-2 py-1 text-sm text-[var(--text)]"
                          />
                        </label>
                        <div className="md:col-span-2">
                          <Button onClick={() => editingMessageValue && updateMessage(index, editingMessageValue)}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="text-sm text-[var(--text)]">{message.title}</p>
                          <p className="text-xs text-[var(--muted)]">{message.description}</p>
                        </div>
                        <Button
                          onClick={() => {
                            setEditingMessageIndex(index);
                            setEditingMessageValue(message);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            applySettingsPatch({
                              customMessages: settings.customMessages.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {activeSection === "data-privacy" ? (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[var(--text)]">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="text-sm font-medium">Data & Privacy</h3>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Track habits locally on this device. Nothing in this section sends personal work data to a server.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Toggle
              checked={settings.smartPause.activityDetectionEnabled}
              onChange={(value) => applySmartPausePatch({ activityDetectionEnabled: value })}
              label="Enable local activity detection"
              helpText="Uses activity signals to improve reminder timing."
            />
            <Toggle
              checked={settings.statsWeeklyTrendEnabled}
              onChange={(value) => applySettingsPatch({ statsWeeklyTrendEnabled: value })}
              label="Show weekly trend on dashboard"
              helpText="Display a compact weekly adherence chart."
            />
          </div>
          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
            <p>Stored locally in Refocus's app data directory: settings, schedules, break history, and reminder timing timestamps.</p>
            <p className="mt-1">Retention: the latest 200 history entries are kept to power dashboard and history views.</p>
            <p className="mt-1">Never stored or uploaded: keystroke content, clipboard contents, screen contents, accounts, or work files.</p>
            <p className="mt-1">Refocus does not include analytics, ads, or cloud sync in this build.</p>
            <p className="mt-1">Custom break lines are stored locally as plain app data, so avoid entering sensitive personal or client information there.</p>
          </div>
          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
            <p>Local history entries: {historyCount}</p>
            <p>First entry: {firstHistoryAt ? new Date(firstHistoryAt).toLocaleString() : "No history yet"}</p>
            <p>Last activity: {lastHistoryAt ? new Date(lastHistoryAt).toLocaleString() : "No history yet"}</p>
          </div>
          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">Privacy policy summary</p>
            <p className="mt-1">Refocus processes reminder data locally so it can time breaks, show history, and restore your preferences after restart.</p>
            <p className="mt-1">If you clear local history here, the stored break log is deleted from the device immediately.</p>
            <p className="mt-1">For distribution, the full policy lives in the repository as <span className="font-mono">PRIVACY.md</span>.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!confirmClearHistory ? (
              <Button variant="ghost" onClick={() => setConfirmClearHistory(true)}>
                Clear local history
              </Button>
            ) : (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    clearHistory();
                    setConfirmClearHistory(false);
                  }}
                >
                  Confirm clear history
                </Button>
                <Button variant="ghost" onClick={() => setConfirmClearHistory(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : null}

      {activeSection === "appearance" ? (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-[var(--text)]">
            <Palette className="h-4 w-4" />
            <h3 className="text-sm font-medium">Appearance</h3>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Keep visuals calm and readable. Appearance is secondary to timing and break quality.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {THEMES.map((theme) => {
              const selected = settings.themeId === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => applySettingsPatch({ themeId: theme.id, customAccent: theme.accent })}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-white/35 bg-white/20 text-[var(--text)] shadow-inner shadow-white/15"
                      : "border-white/20 bg-black/10 text-[var(--text)] hover:bg-black/20"
                  }`}
                >
                  <p className="text-sm">{theme.name}</p>
                  <div className="mt-2 h-2 rounded-full" style={{ background: theme.accent }} />
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-sm text-[var(--text)]">
            <span className="flex items-center gap-1">
              Custom accent
              <SettingHint text="Override theme accent for action highlights." />
            </span>
            <div className="mt-2 rounded-xl border border-white/20 bg-black/10 p-1">
              <input
                type="color"
                value={settings.customAccent}
                onChange={(event) => applySettingsPatch({ customAccent: event.target.value })}
                className="h-7 w-full cursor-pointer rounded-full border-0 bg-transparent p-0"
              />
            </div>
          </label>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Toggle
              checked={settings.reducedMotion}
              onChange={(value) => applySettingsPatch({ reducedMotion: value })}
              label="Reduced motion"
            />
            <Toggle
              checked={settings.highContrast}
              onChange={(value) => applySettingsPatch({ highContrast: value })}
              label="High contrast"
            />
          </div>
          <details
            open={extrasOpen}
            onToggle={(event) => setExtrasOpen(event.currentTarget.open)}
            className="mt-3 rounded-xl border border-dashed border-white/20 bg-black/10 p-3"
          >
            <summary className="cursor-pointer text-sm text-[var(--text)]">Extras (optional)</summary>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <Toggle
                checked={settings.sparkleBackground}
                onChange={(value) => applySettingsPatch({ sparkleBackground: value })}
                label="Ambient sparkles + glow"
              />
              <Toggle
                checked={settings.mascotMode}
                onChange={(value) => applySettingsPatch({ mascotMode: value })}
                label="Mascot mode"
              />
            </div>
          </details>
        </Card>
      ) : null}
    </div>
  );
};
