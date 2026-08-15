// Parse a roadmap.md into its task hierarchy, in one of two shapes:
//
//   Flat (backward-compatible):   ## Phase N — …  →  tasks
//   Hierarchical (the standard):  ## Sub-Project N — …  →  ### Phase N — …  →  tasks
//
// The dashboard picks hierarchical mode automatically when a `## Sub-Project`
// (or legacy `## Chunk`) heading is present; otherwise it falls back to the flat
// `## Phase` reading every existing project already uses.
//
// Line numbers are 0-based (for lock-safe write-back); `raw` is the exact text
// after the checkbox (the anchor findTodoLine matches on); `text` is cleaned for display.

import { readVaultFile } from "@/lib/workos/reader";
import { startedDateOf, stripStarted } from "@/lib/workos/parsers/util";

export type PhaseStatus = "done" | "active" | "todo";

export interface ChunkTask {
  text: string;     // cleaned, for display
  raw: string;      // exact text after "[ ]", used as the write-back anchor
  checked: boolean;
  lineNumber: number;
  /** ISO date from `(started YYYY-MM-DD)` — the board's third state. */
  started?: string;
}

export interface PhaseTasks {
  name: string;
  statusKey: PhaseStatus;
  lineNumber: number;
  tasks: ChunkTask[];
  doneCount: number;
  total: number;
}

export interface SubProjectTasks {
  name: string;          // full heading text after "## "
  statusKey: PhaseStatus;
  lineNumber: number;
  phases: PhaseTasks[];
  doneCount: number;     // summed across this sub-project's phases
  total: number;
}

export interface RoadmapTasks {
  relPath: string;
  phases: PhaseTasks[];               // ALWAYS the flat list of every phase (card math stays simple)
  subProjects?: SubProjectTasks[];    // present only in hierarchical mode
  total: number;
  done: number;
}

function statusKeyOf(s: string): PhaseStatus {
  const t = s.toLowerCase();
  if (/\b(done|complete|completed|shipped|closed|locked)\b/.test(t)) return "done";
  if (/\b(active|in[ -]?progress|wip|started|building|ongoing)\b/.test(t)) return "active";
  return "todo";
}

function clean(t: string): string {
  return t.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
}

/**
 * One task row. `raw` stays byte-exact (it is the write anchor); only the
 * DISPLAY text drops a recognised `(started …)`, whose meaning the board carries
 * as a column and an age badge instead. `(added …)` is left alone — it renders
 * as it always has.
 */
function makeTask(afterBox: string, checked: boolean, lineNumber: number): ChunkTask {
  const raw = afterBox.trim();
  return {
    text: clean(stripStarted(raw)),
    raw,
    checked,
    lineNumber,
    started: startedDateOf(raw),
  };
}

/** A `## Sub-Project N — …` (standard) or legacy `## Chunk N · …` heading. */
const SUBPROJECT_RE = /^##\s+(?:sub-?project|chunk)\b/i;

function rollupPhase(p: PhaseTasks): void {
  p.total = p.tasks.length;
  p.doneCount = p.tasks.filter((t) => t.checked).length;
}

/** Flat mode: every `##` heading is a phase; `###` is ignored (its tasks roll up). */
export function parsePhaseTasks(lines: string[]): PhaseTasks[] {
  const phases: PhaseTasks[] = [];
  let cur: PhaseTasks | null = null;
  let inFence = false;

  lines.forEach((ln, i) => {
    if (/^\s*```/.test(ln)) { inFence = !inFence; return; }
    if (inFence) return;

    const h = ln.match(/^##\s+(.+?)\s*$/); // level-2 heading only (### won't match)
    if (h) {
      cur = { name: h[1].trim(), statusKey: "todo", lineNumber: i, tasks: [], doneCount: 0, total: 0 };
      phases.push(cur);
      return;
    }
    const st = ln.match(/^\s*Status\s*:\s*(.+?)\s*$/i);
    if (st && cur) { cur.statusKey = statusKeyOf(st[1]); return; }

    const cb = ln.match(/^(\s*[-*]\s+)\[([ xX])\]\s*(.*)$/);
    if (cb) {
      if (!cur) {
        cur = { name: "Tasks", statusKey: "todo", lineNumber: -1, tasks: [], doneCount: 0, total: 0 };
        phases.push(cur);
      }
      cur.tasks.push(makeTask(cb[3], cb[2].toLowerCase() === "x", i));
    }
  });

  for (const p of phases) rollupPhase(p);
  return phases;
}

/**
 * Hierarchical mode: `## Sub-Project` groups, `### Phase` phases, tasks beneath.
 * A `Status:` line attaches to whichever is current (phase if one is open under
 * the sub-project, else the sub-project). Tasks or a `###` appearing before any
 * sub-project/phase lazily create a synthetic container so nothing is dropped.
 */
export function parseSubProjects(lines: string[]): SubProjectTasks[] {
  const subs: SubProjectTasks[] = [];
  let curSub: SubProjectTasks | null = null;
  let curPhase: PhaseTasks | null = null;
  let inFence = false;

  const ensureSub = (name: string, line: number): SubProjectTasks => {
    const s: SubProjectTasks = { name, statusKey: "todo", lineNumber: line, phases: [], doneCount: 0, total: 0 };
    subs.push(s);
    return s;
  };
  const ensurePhase = (name: string, line: number): PhaseTasks => {
    if (!curSub) curSub = ensureSub("General", line);
    const p: PhaseTasks = { name, statusKey: "todo", lineNumber: line, tasks: [], doneCount: 0, total: 0 };
    curSub.phases.push(p);
    return p;
  };

  lines.forEach((ln, i) => {
    if (/^\s*```/.test(ln)) { inFence = !inFence; return; }
    if (inFence) return;

    if (SUBPROJECT_RE.test(ln)) {
      const name = ln.replace(/^##\s+/, "").trim();
      curSub = ensureSub(name, i);
      curPhase = null;
      return;
    }
    // Any other `## …` in hierarchical mode is a meta/note section (e.g. Architecture):
    // close the current phase so stray status/tasks don't bleed into a real phase.
    const h2 = ln.match(/^##\s+(.+?)\s*$/);
    if (h2) { curPhase = null; return; }

    const h3 = ln.match(/^###\s+(.+?)\s*$/);
    if (h3) { curPhase = ensurePhase(h3[1].trim(), i); return; }

    const st = ln.match(/^\s*Status\s*:\s*(.+?)\s*$/i);
    if (st) {
      if (curPhase) curPhase.statusKey = statusKeyOf(st[1]);
      else if (curSub) curSub.statusKey = statusKeyOf(st[1]);
      return;
    }

    const cb = ln.match(/^(\s*[-*]\s+)\[([ xX])\]\s*(.*)$/);
    if (cb) {
      if (!curPhase) curPhase = ensurePhase("Tasks", i);
      curPhase.tasks.push(makeTask(cb[3], cb[2].toLowerCase() === "x", i));
    }
  });

  for (const s of subs) {
    for (const p of s.phases) rollupPhase(p);
    s.total = s.phases.reduce((a, p) => a + p.total, 0);
    s.doneCount = s.phases.reduce((a, p) => a + p.doneCount, 0);
    // A sub-project with no explicit Status: inherits "done" only if it has tasks and all are done.
    if (s.statusKey === "todo" && s.total > 0 && s.doneCount === s.total) s.statusKey = "done";
  }
  return subs;
}

export function readRoadmapTasks(
  absPath: string | undefined,
  relPath: string | undefined,
): RoadmapTasks | null {
  if (!absPath || !relPath) return null;
  try {
    const f = readVaultFile(absPath);
    const hierarchical = f.lines.some((ln) => SUBPROJECT_RE.test(ln));

    if (hierarchical) {
      const subProjects = parseSubProjects(f.lines);
      const phases = subProjects.flatMap((s) => s.phases);
      const total = phases.reduce((a, p) => a + p.total, 0);
      const done = phases.reduce((a, p) => a + p.doneCount, 0);
      return { relPath, phases, subProjects, total, done };
    }

    const phases = parsePhaseTasks(f.lines);
    const total = phases.reduce((a, p) => a + p.total, 0);
    const done = phases.reduce((a, p) => a + p.doneCount, 0);
    return { relPath, phases, total, done };
  } catch {
    return null;
  }
}
