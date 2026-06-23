import type { Roadmap, RoadmapPhase } from "../types";
import { classifyStatus, daysUntil, extractISODate } from "./util";

/**
 * Parse a project roadmap.md into phases. Operates on raw lines so the line
 * numbers map exactly to the file (needed for the phase-status write-back).
 *
 * Expected shape:
 *   # Roadmap: <title>
 *   ## Phase 0 — Planning
 *   Goal: ...
 *   Target: 2026-06-20
 *   Status: Active
 */
export function parseRoadmap(lines: string[]): Roadmap {
  const phases: RoadmapPhase[] = [];
  let title: string | undefined;
  let cur: RoadmapPhase | null = null;

  lines.forEach((line, i) => {
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1 && title === undefined && !line.startsWith("##")) {
      title = h1[1].replace(/^Roadmap:\s*/i, "").trim();
      return;
    }
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (cur) phases.push(cur);
      const name = h2[1].trim();
      cur = {
        name,
        shortName: name.split(/[—\-:]/)[0].trim(),
        status: "Unknown",
        statusKey: "unknown",
        lineNumber: i,
      };
      return;
    }
    if (!cur) return;
    const kv = line.match(/^\s*(Goal|Target|Status)\s*:\s*(.*)$/i);
    if (kv) {
      const key = kv[1].toLowerCase();
      const val = kv[2].trim();
      if (key === "goal") cur.goal = val;
      else if (key === "target") {
        cur.target = val;
        cur.targetDate = extractISODate(val);
      } else if (key === "status") {
        cur.status = val || "Unknown";
        cur.statusKey = classifyStatus(val);
        cur.statusLineNumber = i;
      }
    }
  });
  if (cur) phases.push(cur);

  // Mark overdue: a not-yet-done phase whose target date is in the past.
  for (const p of phases) {
    if (p.targetDate && p.statusKey !== "done") {
      p.overdue = daysUntil(p.targetDate) < 0;
    }
  }

  return { title, phases };
}

export function phaseProgress(roadmap?: Roadmap): {
  done: number;
  active: number;
  total: number;
} {
  const phases = roadmap?.phases ?? [];
  return {
    done: phases.filter((p) => p.statusKey === "done").length,
    active: phases.filter((p) => p.statusKey === "active").length,
    total: phases.length,
  };
}
