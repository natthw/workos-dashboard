import type { Cadence, Habit, HabitsDoc } from "../types";
import { domainForName, domainFromTag } from "../domains";
import { parseDay, slugify } from "./util";

/**
 * Parse `habits.md` — the recurring-commitment convention.
 *
 * One habit per bullet. Fields are `·`- or `|`-separated, order-independent:
 *
 *   ## Health
 *   - [health] Pull workout · Mon · 18xp
 *   - Push workout · onDays:Wed · 18xp        (domain inferred from heading)
 *   - [learning] Japanese study · daily · 12xp
 *   - [learning] Music practice · 2x/week · 14xp
 *   - [health] Morning walk · weekly:Sun · 10xp
 *
 * Cadence tokens (case-insensitive): `daily` · `Nx/week` · `weekly[:Day]` ·
 * `onDays:Mon,Wed,Fri` · or a bare comma list of day names (`Mon,Wed,Fri`).
 * Unparseable lines are skipped, never thrown — the doc degrades gracefully.
 */
export function parseHabits(lines: string[], sourceRelPath: string): HabitsDoc {
  const habits: Habit[] = [];
  let section = "";
  const seen = new Set<string>();

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      section = h2[1].trim();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (!bullet || !bullet[1].trim()) continue;

    const habit = parseHabitLine(bullet[1].trim(), section, sourceRelPath);
    if (!habit) continue;
    // de-dupe ids (a repeated label) so streak derivation stays stable
    let id = habit.id;
    let n = 2;
    while (seen.has(id)) id = `${habit.id}-${n++}`;
    seen.add(id);
    habits.push({ ...habit, id });
  }

  return { habits };
}

function parseHabitLine(
  raw: string,
  section: string,
  sourceRelPath: string,
): Habit | null {
  const parts = raw
    .split(/\s*[·|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  // First part holds the optional [domain] tag + the label.
  let head = parts[0];
  let tag: string | undefined;
  const tagMatch = head.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (tagMatch) {
    tag = tagMatch[1];
    head = tagMatch[2].trim();
  }
  const label = head.replace(/[*_`]/g, "").trim();
  if (!label) return null;

  // Remaining parts: cadence + xp, in any order.
  let xp = 12;
  let cadence: Cadence | null = null;
  for (const p of parts.slice(1)) {
    const xpM = p.match(/(\d+)\s*xp/i);
    if (xpM) {
      xp = Number(xpM[1]);
      continue;
    }
    const c = parseCadence(p);
    if (c) cadence = c;
  }
  // A bare day-list in the head (rare) — otherwise default daily.
  if (!cadence) cadence = { kind: "daily" };

  const domain = domainFromTag(tag) ?? domainForName(section || label);

  return {
    id: slugify(label),
    label,
    cadence,
    domain,
    xp,
    sourceRelPath,
  };
}

/** Parse a single cadence token. Returns null if it isn't one. */
export function parseCadence(tok: string): Cadence | null {
  const t = tok.trim().toLowerCase();

  if (/^daily$|^every\s*day$/.test(t)) return { kind: "daily" };

  // "3x/week", "3 x per week", "3×/wk"
  const x = t.match(/^(\d+)\s*[x×]\s*\/?\s*(?:per\s*)?(?:wk|week)$/);
  if (x) return { kind: "xPerWeek", times: Math.max(1, Number(x[1])) };

  // "weekly" or "weekly:Sun"
  const w = t.match(/^weekly(?::?\s*(\w+))?$/);
  if (w) {
    const day = w[1] ? parseDay(w[1]) : undefined;
    return { kind: "weekly", day };
  }

  // "onDays:Mon,Wed,Fri"
  const od = t.match(/^on\s*days?:?\s*(.+)$/);
  const listSrc = od ? od[1] : t;
  const days = listSrc
    .split(/[,\s]+/)
    .map((d) => parseDay(d))
    .filter((d): d is number => d !== undefined);
  if (days.length > 0 && (od || /^[a-z, ]+$/.test(listSrc))) {
    return { kind: "onDays", days: [...new Set(days)].sort((a, b) => a - b) };
  }

  return null;
}
