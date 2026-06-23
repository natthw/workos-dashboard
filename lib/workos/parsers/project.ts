import type { ProjectInfo } from "../types";
import { extractLooseDate, pickSection, sectionMap } from "./util";

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
    sections,
  };
}

/** Detect the LEAD marker used in this vault ("**LEAD**", "— LEAD", etc.). */
export function detectLead(info: ProjectInfo): boolean {
  const hay = `${info.sections["Project Type"] ?? ""} ${info.goal ?? ""}`;
  return /\bLEAD\b/.test(hay);
}

/** Parked / someday projects (deliberately not active) sort last. */
export function isParked(info: ProjectInfo): boolean {
  return /someday|parked/i.test(info.sections["Project Type"] ?? "");
}

/** A concise strategic-state tag for the campaign chip. */
export function projectType(info: ProjectInfo): string | undefined {
  const t = info.sections["Project Type"] ?? "";
  const firstLine = t.split("\n")[0];
  if (detectLead(info)) return "Lead";
  // Check parked BEFORE fast-follow: a parked project's prose may mention
  // "gamification"/"fast-follow" when describing how it relates to others.
  if (isParked(info)) return "Someday";
  if (/fast-follow|gamification/i.test(firstLine)) return "Fast-follow";
  if (/side product/i.test(firstLine)) return "Side product";
  const first = firstLine.replace(/[*_`]/g, "").trim();
  if (!first) return undefined;
  return first.length > 36 ? `${first.slice(0, 34)}…` : first;
}
