import type { DomainKey, Goal, GoalsDoc } from "../types";
import { domainFromTag } from "../domains";
import { extractLooseDate, slugify } from "./util";

/**
 * Parse a per-area `goals.md` of measurable targets.
 *
 *   # Health — Goals
 *   - Body weight: 64 → 66.6 → 70 kg by 2026-11-01
 *   - Japanese fluency: 0 → 28 → 100 % by 2026-11-01
 *   - Pushups: 10 → 50 reps            (two numbers ⇒ current = start)
 *
 * Grammar: `Label: start [→ current] → target unit [by <date>]`.
 * Arrows may be `→` or `->`. `defaultDomain` is the owning area's domain.
 */
export function parseGoals(
  lines: string[],
  sourceRelPath: string,
  defaultDomain: DomainKey,
): GoalsDoc {
  const goals: Goal[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (!bullet || !bullet[1].trim()) continue;
    const goal = parseGoalLine(bullet[1].trim(), sourceRelPath, defaultDomain);
    if (!goal) continue;
    let id = goal.id;
    let n = 2;
    while (seen.has(id)) id = `${goal.id}-${n++}`;
    seen.add(id);
    goals.push({ ...goal, id });
  }

  return { goals };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function parseGoalLine(
  raw: string,
  sourceRelPath: string,
  defaultDomain: DomainKey,
): Goal | null {
  const colon = raw.indexOf(":");
  if (colon < 0) return null;

  let label = raw.slice(0, colon).trim();
  let value = raw.slice(colon + 1).trim();

  let tag: string | undefined;
  const tagMatch = label.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (tagMatch) {
    tag = tagMatch[1];
    label = tagMatch[2].trim();
  }
  label = label.replace(/[*_`]/g, "").trim();
  if (!label) return null;

  const deadlineISO = extractLooseDate(value);
  value = value.replace(/\bby\b.*$/i, "").trim();

  const chunks = value.split(/\s*(?:→|->|—>)\s*/).filter(Boolean);
  if (chunks.length < 2) return null;

  const numAt = (s: string): number | null => {
    const m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  };

  let start: number | null;
  let current: number | null;
  let target: number | null;
  if (chunks.length >= 3) {
    start = numAt(chunks[0]);
    current = numAt(chunks[1]);
    target = numAt(chunks[2]);
  } else {
    start = numAt(chunks[0]);
    target = numAt(chunks[1]);
    current = start;
  }
  if (start === null || current === null || target === null) return null;

  // Unit = trailing non-numeric text of the last chunk.
  const last = chunks[chunks.length - 1];
  const unit = last.replace(/-?\d+(?:\.\d+)?/, "").trim() || "";

  const pct =
    target === start ? (current >= target ? 100 : 0)
      : clamp01((current - start) / (target - start)) * 100;

  return {
    id: slugify(label),
    label,
    start,
    current,
    target,
    unit,
    deadlineISO,
    domain: domainFromTag(tag) ?? defaultDomain,
    sourceRelPath,
    pct: Math.round(pct),
  };
}
