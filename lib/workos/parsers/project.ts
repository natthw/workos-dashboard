import type { Eisenhower, ProjectInfo } from "../types";
import { extractLooseDate, pickSection, sectionMap } from "./util";

/**
 * Parse the body of a `## Eisenhower` block. Tolerant: any subset of the four
 * lines, in any order, with or without a leading blank line. Returns undefined
 * when nothing parsed so legacy projects (no block) fall back to prose markers.
 */
function parseEisenhower(body?: string): Eisenhower | undefined {
  if (!body) return undefined;
  const e: Eisenhower = {};
  for (const ln of body.split("\n")) {
    const m = ln.match(/^\s*(Priority|Urgent|Important|Status)\s*:\s*(.+?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "priority") {
      const n = Number.parseInt(val.replace(/^p/i, ""), 10);
      if (Number.isFinite(n)) e.priority = n;
    } else if (key === "urgent") e.urgent = /^(y|yes|true)$/i.test(val);
    else if (key === "important") e.important = /^(y|yes|true)$/i.test(val);
    else if (key === "status") e.status = val.toLowerCase();
  }
  return e.priority != null || e.urgent != null || e.important != null || e.status
    ? e
    : undefined;
}

/** Parse a project CLAUDE.md into known fields + a generic section map. */
export function parseProject(lines: string[]): ProjectInfo {
  const sections = sectionMap(lines);
  const hardDeadline = pickSection(sections, /hard deadline/i);

  return {
    goal: pickSection(sections, /^goal$/i),
    shippedDefinition: pickSection(sections, /shipped/i),
    hardDeadline,
    hardDeadlineDate: extractLooseDate(hardDeadline),
    currentPhase: pickSection(sections, /current phase/i),
    risks: pickSection(sections, /risk/i),
    techStack: pickSection(sections, /tech stack/i),
    lastSession: pickSection(sections, /last session/i),
    decisionLog: pickSection(sections, /decision log/i),
    eisenhower: parseEisenhower(pickSection(sections, /^eisenhower$/i)),
    sections,
  };
}

/**
 * The "most important" band: Urgent + Important (starred, shown first per the
 * standard). Falls back to the retired `## Project Type` "LEAD" marker only when
 * a project has no `## Eisenhower` block yet.
 */
export function detectLead(info: ProjectInfo): boolean {
  const e = info.eisenhower;
  if (e && (e.urgent != null || e.important != null)) return e.urgent === true && e.important === true;
  const hay = `${info.sections["Project Type"] ?? ""} ${info.goal ?? ""}`;
  return /\bLEAD\b/.test(hay);
}

/**
 * Deliberately de-prioritized projects — dimmed and pushed down. From the
 * Eisenhower block this is the neither-quadrant (not-urgent + not-important →
 * the standard's "dropdown") or an explicit `someday`/`parked` Status.
 * Important-not-urgent is the *normal* band ("most of life lives here"), NOT
 * dimmed. Legacy projects with no block fall back to the prose marker.
 */
export function isParked(info: ProjectInfo): boolean {
  const e = info.eisenhower;
  if (e) {
    if (e.status && /someday|parked/i.test(e.status)) return true;
    if (e.urgent === false && e.important === false) return true;
    if (e.urgent != null || e.important != null) return false;
  }
  return /someday|parked/i.test(info.sections["Project Type"] ?? "");
}

/**
 * Eisenhower display order (the standard's placement contract):
 *   0 = Urgent + Important   (starred, first)
 *   1 = Urgent + not-Important
 *   2 = not-Urgent + Important   (the "parked"/important band — most projects)
 *   3 = not-Urgent + not-Important   (collapsed / someday)
 * A project with no block sorts as band 2 (a plain important-but-not-urgent loop).
 */
export function eisenhowerRank(info: ProjectInfo): number {
  const e = info.eisenhower;
  if (!e || (e.urgent == null && e.important == null)) return 2;
  const u = e.urgent === true;
  const i = e.important !== false; // unknown → treat as important
  if (u && i) return 0;
  if (u && !i) return 1;
  if (!u && i) return 2;
  return 3;
}

/** P1..P5 priority for ordering within a band; unknown sorts last (99). */
export function priorityOf(info: ProjectInfo): number {
  return info.eisenhower?.priority ?? 99;
}

/** A concise work-state tag for the campaign chip — prefers the Eisenhower Status. */
export function projectType(info: ProjectInfo): string | undefined {
  const status = info.eisenhower?.status;
  if (status) return status.charAt(0).toUpperCase() + status.slice(1);

  // Legacy fallback: derive a tag from the `## Project Type` prose.
  const t = info.sections["Project Type"] ?? "";
  const firstLine = t.split("\n")[0];
  if (detectLead(info)) return "Lead";
  if (isParked(info)) return "Someday";
  if (/fast-follow|gamification/i.test(firstLine)) return "Fast-follow";
  if (/side product/i.test(firstLine)) return "Side product";
  const first = firstLine.replace(/[*_`]/g, "").trim();
  if (!first) return undefined;
  return first.length > 36 ? `${first.slice(0, 34)}…` : first;
}
