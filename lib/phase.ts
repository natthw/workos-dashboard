import type { PhaseTasks, RoadmapTasks } from "./roadmap-tasks";

/**
 * The phase a project is actually working in: the one marked active, else the
 * first with work left, else the first with any tasks. Shared by the
 * most-important panel and the board so both mean the same thing by "current".
 *
 * This lives apart from `roadmap-tasks.ts` deliberately. That module reads the
 * vault, so it pulls in `node:crypto`; importing a VALUE from it into a client
 * component drags the whole reader into the browser bundle and the build fails.
 * The import above is type-only, so it is erased — leaving this safe on both
 * sides of the boundary.
 */
export function pickActivePhase(rt?: RoadmapTasks | null): PhaseTasks | null {
  if (!rt) return null;
  const ph = rt.phases;
  return (
    ph.find((p) => p.statusKey === "active" && p.total > 0) ||
    ph.find((p) => p.total > p.doneCount) ||
    ph.find((p) => p.total > 0) ||
    null
  );
}
