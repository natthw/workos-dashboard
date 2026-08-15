// The Next · Doing · Done board — the second lens on the same vault data.
//
// The Eisenhower view answers "what matters"; this answers "what's moving".
// Both are wanted, so they are tabs, not a replacement.
//
// The three columns come free from the WorkOS standard's `(started YYYY-MM-DD)`
// suffix, with no new status field and no Obsidian plugin:
//
//     absent = Next  ·  present + unticked = Doing  ·  ticked = Done
//
// and the suffix yields WIP age for free, which is the most useful number a
// task board produces.

import type { RealmModel } from "@/lib/workos/types";
import type { RoadmapTasks } from "@/lib/roadmap-tasks";
import { pickActivePhase } from "@/lib/phase";
import { daysUntil, stripStarted } from "@/lib/workos/parsers/util";

/** A card ageing in Doing is a stall, and a stall you can see is one you can end. */
const WIP_AGE = { amber: 7, red: 14 };

/**
 * One-active-build says one build. Three is the cap because the rule has been
 * recorded as "broken in practice" since 2026-07-15 with nothing to notice it —
 * a cap you breach on day one teaches you to ignore the cap.
 */
export const WIP_CAP = 3;

/**
 * How many Next / Done cards each source contributes. The vault holds ~260 open
 * tasks; a column of 260 is a backlog dump, not a board. Three per source
 * mirrors the most-important panel's existing `limit={3}`, and the true
 * remainder is always reported rather than silently dropped.
 */
const PER_SOURCE = 3;

export type WipLevel = "fresh" | "amber" | "red";

export interface BoardCard {
  /** Stable across renders and unique across files: the write target itself. */
  id: string;
  text: string;
  /** Exact post-checkbox text — the write anchor. Never cleaned. */
  anchor: string;
  relPath: string;
  lineNumber: number;
  /** Heading to scope the anchor to, so a repeated task text stays unambiguous. */
  section?: string;
  source: string;
  sourceHref?: string;
  checked: boolean;
  started?: string;
  ageDays?: number;
  level: WipLevel;
}

export interface BoardView {
  next: BoardCard[];
  doing: BoardCard[];
  done: BoardCard[];
  /** True totals, so a capped column never reads as "that's all of it". */
  nextTotal: number;
  doneTotal: number;
  wipCap: number;
  overCap: boolean;
}

function wipLevel(days: number): WipLevel {
  if (days >= WIP_AGE.red) return "red";
  if (days >= WIP_AGE.amber) return "amber";
  return "fresh";
}

function card(
  o: Omit<BoardCard, "id" | "ageDays" | "level">,
): BoardCard {
  const ageDays = o.started ? Math.max(0, -daysUntil(o.started)) : undefined;
  return {
    ...o,
    id: `${o.relPath}#${o.lineNumber}`,
    ageDays,
    level: ageDays != null ? wipLevel(ageDays) : "fresh",
  };
}

/**
 * Build the board.
 *
 * The three columns are scoped ASYMMETRICALLY, on purpose:
 *
 * - **Doing** is swept from the WHOLE vault — every project including parked
 *   ones, and every area. The WIP cap is the feature; a cap computed from a
 *   subset would under-count exactly when it matters most.
 * - **Next** and **Done** are scoped to each live project's *current phase*
 *   plus the area backlogs, then capped per source. They are context for the
 *   Doing column, and the whole backlog as a wall of cards would bury it.
 *
 * "Done" here means completed within the phases currently in flight. The vault
 * records no completion date — `(started …)` is cleared on tick — so this is
 * the closest honest proxy for "recently done", and it is not claimed as more.
 */
export function buildBoard(
  realm: RealmModel,
  tasksBySlug: Record<string, RoadmapTasks>,
  parkedSlugs: ReadonlySet<string>,
): BoardView {
  const next: BoardCard[] = [];
  const doing: BoardCard[] = [];
  const done: BoardCard[] = [];
  let nextTotal = 0;
  let doneTotal = 0;

  for (const c of realm.campaigns) {
    const rt = tasksBySlug[c.slug];
    if (!rt) continue;
    const href = `/project/${c.slug}`;

    // Doing: every phase, parked or not — completeness over tidiness.
    for (const ph of rt.phases) {
      for (const t of ph.tasks) {
        if (t.checked || !t.started) continue;
        doing.push(
          card({
            text: t.text, anchor: t.raw, relPath: rt.relPath, lineNumber: t.lineNumber,
            section: ph.name, source: c.name, sourceHref: href,
            checked: false, started: t.started,
          }),
        );
      }
    }

    if (parkedSlugs.has(c.slug)) continue;

    const phase = pickActivePhase(rt);
    if (!phase) continue;
    const mk = (t: (typeof phase.tasks)[number]) =>
      card({
        text: t.text, anchor: t.raw, relPath: rt.relPath, lineNumber: t.lineNumber,
        section: phase.name, source: c.name, sourceHref: href,
        checked: t.checked, started: t.started,
      });

    const openHere = phase.tasks.filter((t) => !t.checked && !t.started);
    const doneHere = phase.tasks.filter((t) => t.checked);
    nextTotal += openHere.length;
    doneTotal += doneHere.length;
    next.push(...openHere.slice(0, PER_SOURCE).map(mk));
    done.push(...doneHere.slice(0, PER_SOURCE).map(mk));
  }

  for (const p of realm.provinces) {
    const rel = p.todosRelPath;
    if (!rel || !p.todos) continue;
    // TodoItem.text is already the exact post-checkbox text, which is what the
    // anchor needs (`raw` there is the whole line, prefix included) — so the
    // suffix is dropped from the DISPLAY copy only, never from the anchor. Same
    // rule the roadmap side applies in makeTask: the board carries `(started …)`
    // as a column and an age badge, so repeating it in the text is noise.
    const mk = (t: (typeof p.todos.sections)[number]["items"][number]) =>
      card({
        text: stripStarted(t.text).trim(), anchor: t.text, relPath: rel, lineNumber: t.lineNumber,
        section: t.section || undefined, source: p.name,
        checked: t.checked, started: t.started,
      });

    const items = p.todos.sections.flatMap((s) => s.items);
    for (const t of items) {
      if (!t.checked && t.started) doing.push(mk(t));
    }
    const openHere = items.filter((t) => !t.checked && !t.started);
    const doneHere = items.filter((t) => t.checked);
    nextTotal += openHere.length;
    doneTotal += doneHere.length;
    next.push(...openHere.slice(0, PER_SOURCE).map(mk));
    done.push(...doneHere.slice(0, PER_SOURCE).map(mk));
  }

  // Oldest first: the thing that has been in flight longest is the thing to ask
  // about, and it is the one a plain list would otherwise bury.
  doing.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));

  return { next, doing, done, nextTotal, doneTotal, wipCap: WIP_CAP, overCap: doing.length > WIP_CAP };
}
