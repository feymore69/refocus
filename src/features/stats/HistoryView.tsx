import { useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Segmented } from "../../components/ui/segmented";
import { useAppStore } from "../../store/useAppStore";
import type { HistoryRangeFilter } from "../../types/settings";

const rangeOptions: { label: string; value: HistoryRangeFilter }[] = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

const timeLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const dayKey = (timestamp: number) => new Date(timestamp).toLocaleDateString();

const dayHeading = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return "Today";
  }
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

const cutoffMs = (filter: HistoryRangeFilter) => {
  const now = Date.now();
  if (filter === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }
  if (filter === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (filter === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  return 0;
};

const badgeClass = (result: "completed" | "skipped" | "snoozed") => {
  if (result === "completed") return "bg-emerald-500/15 text-emerald-200";
  if (result === "skipped") return "bg-rose-500/20 text-rose-200";
  return "bg-amber-500/20 text-amber-200";
};

export const HistoryView = () => {
  const stats = useAppStore((s) => s.stats);
  const filter = useAppStore((s) => s.historyRangeFilter);
  const setFilter = useAppStore((s) => s.setHistoryRangeFilter);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const cutoff = cutoffMs(filter);
    return stats.history.filter((entry) => (entry.actualTimestamp ?? entry.timestamp) >= cutoff);
  }, [filter, stats.history]);

  const summary = useMemo(() => {
    const completed = filtered.filter((item) => item.result === "completed").length;
    const skipped = filtered.filter((item) => item.result === "skipped").length;
    const snoozed = filtered.filter((item) => item.result === "snoozed").length;
    const adherence = completed + skipped === 0 ? 0 : Math.round((completed / (completed + skipped)) * 100);
    const byTier = filtered
      .filter((item) => item.result === "completed")
      .reduce(
        (acc, item) => {
          acc[item.tier] += 1;
          return acc;
        },
        { micro: 0, short: 0, long: 0 },
      );
    return { completed, skipped, snoozed, adherence, byTier };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((entry) => {
      const key = dayKey(entry.actualTimestamp ?? entry.timestamp);
      const current = map.get(key) ?? [];
      current.push(entry);
      map.set(key, current);
    });
    return Array.from(map.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([, entries]) =>
        entries.sort((a, b) => (b.actualTimestamp ?? b.timestamp) - (a.actualTimestamp ?? a.timestamp)),
      );
  }, [filtered]);

  const resultLabel = (result: "completed" | "skipped" | "snoozed") => {
    if (result === "completed") return "Completed";
    if (result === "skipped") return "Skipped";
    return "Snoozed";
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">History analytics</p>
          <Segmented<HistoryRangeFilter> value={filter} onChange={setFilter} options={rangeOptions} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Adherence</p>
            <p className="text-xl font-semibold text-[var(--text)]">{summary.adherence}%</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Events</p>
            <p className="text-xl font-semibold text-[var(--text)]">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Completed / skipped</p>
            <p className="text-xl font-semibold text-[var(--text)]">
              {summary.completed} / {summary.skipped}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Snoozed</p>
            <p className="text-xl font-semibold text-[var(--text)]">{summary.snoozed}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/10 p-3">
            <p className="text-xs text-[var(--muted)]">Focused time today</p>
            <p className="text-xl font-semibold text-[var(--text)]">{stats.activeMinutesToday} min</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3">
          <p className="text-sm font-medium text-[var(--text)]">Break tier mix</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[var(--muted)]">Micro</p>
              <p className="font-semibold text-[var(--text)]">{summary.byTier.micro}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[var(--muted)]">Short</p>
              <p className="font-semibold text-[var(--text)]">{summary.byTier.short}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[var(--muted)]">Long</p>
              <p className="font-semibold text-[var(--text)]">{summary.byTier.long}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs text-[var(--muted)]">
          Adherence = completed breaks divided by completed + skipped. Snoozed events are tracked separately.
        </div>
      </Card>

      <Card className="flex h-[620px] flex-col">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Timeline</p>
        {grouped.length === 0 ? (
          <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-sm text-[var(--muted)]">
            No history in this range yet. Start a focus cycle and complete your first break to populate this timeline.
          </div>
        ) : (
          <div className="refocus-scrollbar mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {grouped.map((entries) => (
              <div key={entries[0].id} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  {dayHeading(entries[0].actualTimestamp ?? entries[0].timestamp)}
                </p>
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                    className="w-full cursor-pointer rounded-xl border border-white/15 bg-black/10 px-3 py-2 text-left transition hover:bg-black/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass(entry.result)}`}>
                          {resultLabel(entry.result)}
                        </span>
                        <span className="text-sm capitalize text-[var(--text)]">{entry.tier} break</span>
                      </div>
                      <span className="text-xs text-[var(--muted)]">{timeLabel(entry.actualTimestamp ?? entry.timestamp)}</span>
                    </div>
                    {expandedId === entry.id ? (
                      <div className="mt-2 border-t border-white/10 pt-2 text-xs text-[var(--muted)]">
                        <p>Mode: {entry.mode}</p>
                        <p>Scheduled: {timeLabel(entry.scheduledTimestamp ?? entry.timestamp)}</p>
                        <p>Auto-started: {entry.autoStarted ? "Yes" : "No"}</p>
                        <p>Snooze count: {entry.snoozeCount}</p>
                        {entry.remainingSecondsAtAction !== undefined ? (
                          <p>Remaining when action happened: {entry.remainingSecondsAtAction}s</p>
                        ) : null}
                        <p>Reason: {entry.reason ?? "Scheduled reminder"}</p>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
