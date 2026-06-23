import type { LogEntry } from "../types";

/**
 * Parse log.md (newest-first). Entries look like:
 *   ## [2026-06-04] decision | Lead product → Thai Portfolio Tracker first
 *   - body line
 */
export function parseLog(lines: string[], limit = 12): LogEntry[] {
  const entries: LogEntry[] = [];
  let cur: LogEntry | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (cur) {
      cur.body = buf.join("\n").trim();
      entries.push(cur);
    }
    buf = [];
  };

  for (const line of lines) {
    const m = line.match(/^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+([^|]+?)\s*\|\s*(.+?)\s*$/);
    if (m) {
      flush();
      cur = { date: m[1], focus: m[2].trim(), title: m[3].trim(), body: "" };
      continue;
    }
    if (cur) buf.push(line);
  }
  flush();

  return entries.slice(0, limit);
}
