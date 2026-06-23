// Parse a roadmap.md into phases, each with its checkbox "chunk tasks".
// Line numbers are 0-based (for lock-safe write-back); `raw` is the exact text
// after the checkbox (the anchor findTodoLine matches on); `text` is cleaned for display.

import { readVaultFile } from "@/lib/workos/reader";

export type PhaseStatus = "done" | "active" | "todo";

export interface ChunkTask {
  text: string;     // cleaned, for display
  raw: string;      // exact text after "[ ]", used as the write-back anchor
  checked: boolean;
  lineNumber: number;
}

export interface PhaseTasks {
  name: string;
  statusKey: PhaseStatus;
  lineNumber: number;
  tasks: ChunkTask[];
  doneCount: number;
  total: number;
}

export interface RoadmapTasks {
  relPath: string;
  phases: PhaseTasks[];
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
      const checked = cb[2].toLowerCase() === "x";
      cur.tasks.push({ text: clean(cb[3]), raw: cb[3].trim(), checked, lineNumber: i });
    }
  });

  for (const p of phases) {
    p.total = p.tasks.length;
    p.doneCount = p.tasks.filter((t) => t.checked).length;
  }
  return phases;
}

export function readRoadmapTasks(
  absPath: string | undefined,
  relPath: string | undefined,
): RoadmapTasks | null {
  if (!absPath || !relPath) return null;
  try {
    const f = readVaultFile(absPath);
    const phases = parsePhaseTasks(f.lines);
    const total = phases.reduce((a, p) => a + p.total, 0);
    const done = phases.reduce((a, p) => a + p.doneCount, 0);
    return { relPath, phases, total, done };
  } catch {
    return null;
  }
}
