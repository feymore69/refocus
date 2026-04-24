import { Card } from "../../components/ui/card";

export const InstructionsView = () => (
  <div className="grid gap-4">
    <Card>
      <h2 className="text-lg font-semibold text-[var(--text)]">How to use Refocus</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--text)]">
        <li>Set your work interval and break duration in Settings.</li>
        <li>Keep "Stay in tray when closed" enabled for background mode.</li>
        <li>When reminder appears, hit Start break now and follow the countdown.</li>
        <li>Use Snooze for a short delay, or Strict mode to reduce skipping.</li>
      </ol>
    </Card>

    <Card>
      <h3 className="text-base font-semibold text-[var(--text)]">Tray + background behavior</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Closing the window does not quit the app when tray mode is on. It keeps running in the system tray and still
        schedules reminders. Right-click the tray icon for quick actions like pause, resume, start break, or quit.
      </p>
    </Card>
  </div>
);
