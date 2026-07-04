// Parse the vault-root VISION.md into the annual goals horizon.
//
// VISION.md is a vendor-neutral WorkOS standard file (sibling of NOW.md /
// habits.md) that names the year's outcomes, grouped by life domain:
//
//   # Vision 2026
//   > Articulate and become the future me.
//
//   ## learning
//   - Piano practice: 0 → 12 → 100 hrs by 2026-12-31      # metric goal → a bar
//   - Learn a Vivaldi piece · status: todo                # milestone goal → a chip
//
//   ## career
//   - Release v1 + full CI/CD [[workos-dashboard]]        # linked → progress derived from the project
//
// Two line grammars, both lenient:
//   metric    — `Label: [start →] current → target [unit] [by <date>] [[slug]]`
//   milestone — `Label [· status: todo|active|done] [by <date>] [[slug]]`
//
// `[[slug]]` optionally links a goal to a campaign; the view derives that goal's
// progress from the project's roadmap %. Only the five domain headings collect
// goals — any other `##` section is ignored. Unparseable lines are skipped, never
// thrown (same contract as every other parser).

import type { DomainKey, StatusKey, VisionDoc, VisionGoal } from "../types";
import { domainFromTag } from "../domains";
import { extractLooseDate } from "./util";

const NUM_RE = /-?\d+(?:\.\d+)?/;

function parseNum(s: string): number | undefined {
  const m = s.match(NUM_RE);
  return m ? Number(m[0]) : undefined;
}

/** Trailing label/value separators left behind after stripping link/date clauses. */
function trimSep(s: string): string {
  return s.replace(/[·•|,;:\-–—]+\s*$/g, "").trim();
}

function statusKeyOf(s: string): StatusKey {
  const t = s.toLowerCase();
  if (/\b(done|complete|completed|shipped|closed|achieved)\b/.test(t)) return "done";
  if (/\b(active|in[ -]?progress|wip|started|ongoing|building)\b/.test(t)) return "active";
  return "todo";
}

export function parseVision(lines: string[], sourceRelPath: string): VisionDoc {
  const goals: VisionGoal[] = [];
  let year: number | undefined;
  let tagline: string | undefined;
  let domain: DomainKey | null = null;
  let inFence = false;
  let inComment = false;

  lines.forEach((raw, i) => {
    let ln = raw.replace(/\s+$/g, "");

    // Strip HTML comments (which may span lines) so commented-out example bullets
    // are never parsed as real goals.
    if (inComment) {
      const end = ln.indexOf("-->");
      if (end === -1) return;
      inComment = false;
      ln = ln.slice(end + 3);
    }
    for (;;) {
      const start = ln.indexOf("<!--");
      if (start === -1) break;
      const end = ln.indexOf("-->", start + 4);
      if (end === -1) { ln = ln.slice(0, start); inComment = true; break; }
      ln = ln.slice(0, start) + " " + ln.slice(end + 3);
    }
    if (!ln.trim()) return;

    if (/^\s*```/.test(ln)) { inFence = !inFence; return; }
    if (inFence) return;

    const h1 = ln.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      const y = h1[1].match(/\b(20\d{2})\b/);
      if (y) year = Number(y[1]);
      return;
    }

    const bq = ln.match(/^>\s*(.+?)\s*$/);
    if (bq && !tagline) { tagline = bq[1].replace(/\*\*/g, "").trim(); return; }

    const h2 = ln.match(/^##\s+(.+?)\s*$/);
    if (h2) { domain = domainFromTag(h2[1]) ?? null; return; }

    const bullet = ln.match(/^\s*[-*]\s+(.*)$/);
    if (!bullet || domain == null) return;

    const goal = parseGoalLine(bullet[1], domain, sourceRelPath, i);
    if (goal) goals.push(goal);
  });

  return { year, tagline, goals };
}

function parseGoalLine(
  body: string,
  domain: DomainKey,
  sourceRelPath: string,
  lineNumber: number,
): VisionGoal | null {
  let s = body.trim();
  if (!s) return null;

  // [[project-slug]] link
  let projectSlug: string | undefined;
  const link = s.match(/\[\[([^\]]+)\]\]/);
  if (link) { projectSlug = link[1].trim(); s = s.replace(link[0], "").trim(); }

  // "by <date>" target date (ISO or loose "September 30, 2026")
  const date = extractLooseDate(s);
  s = trimSep(s.replace(/\bby\b\s+\S.*$/i, "").trim());

  // metric: contains a "→" progression
  if (s.includes("→")) {
    const colon = s.indexOf(":");
    let label = "";
    let valuesPart = s;
    if (colon !== -1 && !s.slice(0, colon).includes("→")) {
      label = s.slice(0, colon).trim();
      valuesPart = s.slice(colon + 1).trim();
    }
    const parts = valuesPart.split("→").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const targetPart = parts[parts.length - 1];
      const unit = targetPart.replace(NUM_RE, "").trim() || undefined;
      return {
        label: label || "Goal",
        domain,
        kind: "metric",
        start: parts.length >= 3 ? parseNum(parts[0]) ?? 0 : 0,
        current: parseNum(parts[parts.length - 2]),
        target: parseNum(targetPart),
        unit,
        date,
        projectSlug,
        sourceRelPath,
        lineNumber,
      };
    }
  }

  // milestone: optional "· status: <word>"
  let statusKey: StatusKey = "todo";
  let label = s;
  const st = s.match(/(?:[·•|,]|\s[-–—])\s*status\s*:\s*([A-Za-z -]+)$/i);
  if (st && st.index != null) {
    statusKey = statusKeyOf(st[1]);
    label = trimSep(s.slice(0, st.index));
  } else {
    const bare = s.match(/^status\s*:\s*([A-Za-z -]+)$/i);
    if (bare) { statusKey = statusKeyOf(bare[1]); label = "Goal"; }
  }

  return {
    label: label || "Goal",
    domain,
    kind: "milestone",
    statusKey,
    date,
    projectSlug,
    sourceRelPath,
    lineNumber,
  };
}
