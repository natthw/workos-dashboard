import type { StatusKey } from "../types";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** Pull an ISO date (YYYY-MM-DD) out of a string, if present. */
export function extractISODate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

/** Pull a loose "August 1, 2026" date and normalise to ISO. */
export function extractLooseDate(s?: string): string | undefined {
  if (!s) return undefined;
  const iso = extractISODate(s);
  if (iso) return iso;
  const m = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) {
      return `${m[3]}-${String(mon).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
    }
  }
  return undefined;
}

/** Classify a roadmap phase status string into a stable key. */
export function classifyStatus(raw: string): StatusKey {
  const s = raw.toLowerCase();
  if (/done|complete|shipped|finished/.test(s)) return "done";
  if (/active|in progress|wip|ongoing/.test(s)) return "active";
  if (/not started|todo|planned|backlog|pending|blocked/.test(s)) return "todo";
  return "unknown";
}

/**
 * Split markdown lines into a map of { "## heading" → body text }.
 * Skips a leading single "# title". Used by the project + hot parsers.
 */
export function sectionMap(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let curKey = "";
  let buf: string[] = [];
  const flush = () => {
    if (curKey) out[curKey] = buf.join("\n").trim();
    buf = [];
  };
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      flush();
      curKey = h2[1].trim();
      continue;
    }
    if (curKey) buf.push(line);
  }
  flush();
  return out;
}

/** Find a section value whose heading matches a regex. */
export function pickSection(
  sections: Record<string, string>,
  re: RegExp,
): string | undefined {
  const key = Object.keys(sections).find((k) => re.test(k));
  return key ? sections[key] : undefined;
}

/** Days from today (local) to an ISO date; negative if past. */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(`${iso}T00:00:00`);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** Whole days since a timestamp (ms). Never negative; 0 = touched today. */
export function daysSinceMs(ms: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - ms) / 86_400_000));
}

/** Local "today" as YYYY-MM-DD (the app's day boundary = local midnight). */
export function todayISO(from: Date = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  const d = String(from.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Stable kebab-case slug from a label, e.g. "Pull workout" → "pull-workout". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const DAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/** Parse a weekday token ("Mon", "monday", "0".."6") → 0=Sun..6=Sat, or undefined. */
export function parseDay(tok: string): number | undefined {
  const t = tok.trim().toLowerCase();
  if (t in DAY_NAMES) return DAY_NAMES[t];
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : undefined;
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 0=Sun..6=Sat → "Mon". */
export function dayShort(d: number): string {
  return SHORT_DAYS[((d % 7) + 7) % 7];
}

/** Weekday (0=Sun..6=Sat) of an ISO date in local time. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay();
}

/** Shift an ISO date by `n` days (local). */
export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `iso` (ISO week start), as YYYY-MM-DD. */
export function startOfWeekISO(iso: string): string {
  const wd = weekdayOf(iso); // 0=Sun..6=Sat
  const offset = wd === 0 ? -6 : 1 - wd; // back to Monday
  return addDaysISO(iso, offset);
}
