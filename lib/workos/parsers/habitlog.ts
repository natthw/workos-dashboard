import type { HabitLogEntry } from "../types";

/**
 * Parse the append-only `habits-log.md` — the canonical streak source.
 *
 *   - 2026-06-04 japanese-study
 *   - 2026-06-05 pull-workout
 *
 * One dated completion per line: `- <YYYY-MM-DD> <habit-id>`. Order-agnostic;
 * the date may also be wrapped in `[ ]`. Anything else is ignored.
 */
export function parseHabitLog(lines: string[]): HabitLogEntry[] {
  const out: HabitLogEntry[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\[?(\d{4}-\d{2}-\d{2})\]?\s+([A-Za-z0-9][\w-]*)\s*$/);
    if (m) out.push({ date: m[1], habitId: m[2].toLowerCase() });
  }
  return out;
}

/** True if (habitId, dateISO) already has a completion line. */
export function isLogged(
  log: HabitLogEntry[],
  habitId: string,
  dateISO: string,
): boolean {
  return log.some((e) => e.habitId === habitId && e.date === dateISO);
}
