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
/** A `## Sub-Project N — …` (standard) or legacy `## Chunk N · …` heading. */
const SUBPROJECT_RE = /^##\s+(?:sub-?project|chunk)\b/i;

export function parseRoadmap(lines: string[]): Roadmap {
  const phases: RoadmapPhase[] = [];
  let title: string | undefined;
  let cur: RoadmapPhase | null = null;

  // In hierarchical roadmaps (## Sub-Project → ### Phase) a phase is an H3; in
  // flat roadmaps a phase is an H2. Detect the mode once so phase counts (the
  // card's fallback when there are no checkbox tasks) stay correct either way.
  const hierarchical = lines.some((ln) => SUBPROJECT_RE.test(ln));
  const phaseHeadingRe = hierarchical ? /^###\s+(.+?)\s*$/ : /^##\s+(.+?)\s*$/;

  lines.forEach((line, i) => {
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1 && title === undefined && !line.startsWith("##")) {
      title = h1[1].replace(/^Roadmap:\s*/i, "").trim();
      return;
    }
    const h2 = line.match(phaseHeadingRe);
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
