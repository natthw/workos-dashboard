import type { AreaGoal } from "../types";

/**
 * Parse an area's goals.md (the WorkOS standard's numeric area metrics):
 *
 *   Label: start → current → target unit by <date>
 *
 * optionally written as a `- ` bullet; the arrow may be `→` or `->`; the unit
 * and the `by <date>` tail are both optional. Unparseable lines are skipped,
 * never thrown (the vault-wide parser contract).
 */
const GOAL_RE =
  /^\s*(?:[-*]\s+)?([^:]+):\s*(-?[\d.,]+)\s*(?:→|->)\s*(-?[\d.,]+)\s*(?:→|->)\s*(-?[\d.,]+)\s*(.*)$/;

export function parseAreaGoals(lines: string[]): AreaGoal[] {
  const out: AreaGoal[] = [];
  for (const ln of lines) {
    const m = ln.match(GOAL_RE);
    if (!m) continue;
    const num = (s: string) => Number(s.replace(/,/g, ""));
    const start = num(m[2]);
    const current = num(m[3]);
    const target = num(m[4]);
    if ([start, current, target].some((n) => Number.isNaN(n))) continue;
    const rest = (m[5] || "").trim();
    const by = rest.match(/\bby\s+(.+)$/i);
    const unit =
      (by && by.index != null ? rest.slice(0, by.index) : rest).trim() || undefined;
    out.push({
      label: m[1].trim(),
      start,
      current,
      target,
      unit,
      dateText: by?.[1]?.trim(),
    });
  }
  return out;
}
