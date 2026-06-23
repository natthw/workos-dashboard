import type { HotDoc } from "../types";
import { pickSection, sectionMap } from "./util";

/** Parse hot.md (the war-council briefing) into its standard sections. */
export function parseHot(lines: string[], mtimeMs: number): HotDoc {
  const sections = sectionMap(lines);
  return {
    lastUpdated: pickSection(sections, /last updated/i),
    currentState: pickSection(sections, /current state/i),
    projectStates: pickSection(sections, /project states/i),
    openDecisions: pickSection(sections, /open decisions/i),
    activeThreads: pickSection(sections, /active threads/i),
    mtimeMs,
  };
}
