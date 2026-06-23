import type { NowDoc } from "../types";

/**
 * Parse NOW.md into its four buckets by heading keyword (emoji-agnostic):
 *   ## 🎯 This week's focus
 *   ## ▶️ Next actions — ...
 *   ## ⏳ Waiting for / blocked
 *   ## 💤 Someday / maybe — ...
 */
export function parseNow(lines: string[]): NowDoc {
  const out: NowDoc = { nextActions: [], waiting: [], someday: [] };
  let bucket: "focus" | "next" | "waiting" | "someday" | null = null;
  const focusLines: string[] = [];

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      const t = h2[1].toLowerCase();
      if (t.includes("focus")) bucket = "focus";
      else if (t.includes("next action")) bucket = "next";
      else if (t.includes("waiting") || t.includes("blocked")) bucket = "waiting";
      else if (t.includes("someday") || t.includes("maybe")) bucket = "someday";
      else bucket = null;
      continue;
    }
    if (!bucket) continue;

    if (bucket === "focus") {
      if (line.trim() && !line.startsWith("---")) focusLines.push(line);
      continue;
    }

    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (item && item[1].trim()) {
      const val = item[1].trim();
      if (bucket === "next") out.nextActions.push(val);
      else if (bucket === "waiting") out.waiting.push(val);
      else if (bucket === "someday") out.someday.push(val);
    }
  }

  out.focus = focusLines.join("\n").trim() || undefined;
  return out;
}
