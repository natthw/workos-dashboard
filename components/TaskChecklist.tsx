"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChunkTask } from "@/lib/roadmap-tasks";
import { emitReceipt } from "@/lib/write-receipts";

/**
 * Interactive checkbox list for a phase's chunk tasks. Toggling writes back to
 * the WorkOS roadmap.md (lock-safe, compare-and-swap) via /api/todo/toggle.
 * Optimistic update; reverts on conflict/error.
 *
 * Completed tasks collapse into a per-checklist "Completed (N)" dropdown (closed
 * by default) so a long history doesn't bury the open work. The dropdown lives
 * INSIDE each checklist, so completed items stay attached to their own
 * phase / sub-project — never pooled into one project-wide list.
 *
 * Each row is a real <button role="checkbox">, so it is keyboard-focusable and
 * toggles on Space/Enter (WCAG 2.1.1) — the app's core write action.
 *
 * Writes are tracked PER LINE, not per list. An earlier component-wide `busy`
 * lock made every sibling checkbox a silent no-op while one save was in flight,
 * so ticking three things quickly wrote one and dropped two with no feedback of
 * any kind — the worst failure available to an app whose whole promise is
 * honest write-back. The API is idempotent and CAS-guarded per file, so
 * independent lines are safe to write concurrently. Rows are never `disabled`
 * either: browsers blur a disabled element to <body>, which dropped keyboard
 * focus mid-interaction on every single write.
 */
export function TaskChecklist({ relPath, tasks: initial, limit }: { relPath: string; tasks: ChunkTask[]; limit?: number }) {
  const [tasks, setTasks] = useState<ChunkTask[]>(initial);
  const [pending, setPending] = useState<ReadonlySet<number>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const [synced, setSynced] = useState(initial);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const refocus = useRef<{ line: number; slot: number } | null>(null);

  // Adopt fresh server state after router.refresh() (our own write, or the
  // 15s freshness probe picking up an edit made in Obsidian). Held back while a
  // write is in flight so a re-render can't clobber the optimistic row.
  if (initial !== synced && pending.size === 0) {
    setSynced(initial);
    setTasks(initial);
  }

  // Ticking an open task moves it out of the open list and into the collapsed
  // "Completed" fold — a different parent, so React unmounts the row and the
  // browser drops focus to <body>. Put focus back: on the same row if it's still
  // visible (a failed write reverts it), otherwise on whatever now occupies the
  // slot it left, so working down a list with the keyboard keeps advancing.
  // Only for keyboard users — a mouse tick must not move focus.
  useEffect(() => {
    const want = refocus.current;
    if (!want) return;
    refocus.current = null;
    const root = listRef.current;
    if (!root) return;
    const shown = (el: Element | null): el is HTMLElement =>
      !!el && (el as HTMLElement).getBoundingClientRect().height > 0;

    const sameRow = root.querySelector(`[data-line="${want.line}"]`);
    if (shown(sameRow)) {
      sameRow.focus({ preventScroll: true });
      return;
    }
    const openRows = Array.from(root.querySelectorAll<HTMLElement>(":scope > .todo-row"));
    const next = openRows[Math.min(want.slot, openRows.length - 1)];
    if (next) next.focus({ preventScroll: true });
    else root.querySelector<HTMLElement>(".done-toggle")?.focus({ preventScroll: true });
  }, [tasks]);

  const mark = (set: ReadonlySet<number>, line: number, on: boolean): ReadonlySet<number> => {
    const next = new Set(set);
    if (on) next.add(line);
    else next.delete(line);
    return next;
  };

  // `01_Projects/Personal_Finance/roadmap.md` → `Personal_Finance/roadmap.md`
  const shortPath = (p: string) => p.split("/").slice(-2).join("/");

  async function toggle(t: ChunkTask) {
    if (pending.has(t.lineNumber)) return; // only guards double-firing the SAME row
    const next = !t.checked;
    setPending((s) => mark(s, t.lineNumber, true));
    setFailed((s) => mark(s, t.lineNumber, false));
    setTasks((ts) => ts.map((x) => (x.lineNumber === t.lineNumber ? { ...x, checked: next } : x)));
    try {
      const r = await fetch("/api/todo/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relPath,
          lineNumber: t.lineNumber,
          text: t.raw,
          expectedChecked: t.checked,
          checked: next,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.reason || `The write failed (HTTP ${r.status}).`);

      emitReceipt({
        kind: j.already ? "nochange" : "wrote",
        file: shortPath(j.relPath ?? relPath),
        line: j.line ?? t.lineNumber + 1,
        beforeMark: j.beforeMark,
        afterMark: j.afterMark,
        text: t.text,
        tsISO: j.tsISO,
      });

      // Re-pull server-rendered aggregates (progress %, phase/sub-project counts)
      // so they reflect the write, not just this checkbox's local state.
      router.refresh();
    } catch (e) {
      setTasks((ts) => ts.map((x) => (x.lineNumber === t.lineNumber ? { ...x, checked: t.checked } : x)));
      setFailed((s) => mark(s, t.lineNumber, true));
      emitReceipt({
        kind: "failed",
        file: shortPath(relPath),
        line: t.lineNumber + 1,
        text: t.text,
        reason: e instanceof Error ? e.message : "Couldn't save. Nothing was changed.",
        onRetry: () => toggle(t),
      });
    } finally {
      setPending((s) => mark(s, t.lineNumber, false));
    }
  }

  if (!tasks.length) return null;

  const openTasks = tasks.filter((t) => !t.checked);
  const doneTasks = tasks.filter((t) => t.checked);
  // On the Most-important panel we show only the first few open tasks; the rest
  // (and the completed history) live "in the ticket" — the full project page.
  const shownOpen = limit != null ? openTasks.slice(0, limit) : openTasks;
  const hiddenOpen = openTasks.length - shownOpen.length;

  const row = (t: ChunkTask) => {
    const writing = pending.has(t.lineNumber);
    const didFail = failed.has(t.lineNumber);
    return (
      <button
        type="button"
        className={`todo-row${writing ? " writing" : ""}${didFail ? " failed" : ""}`}
        key={t.lineNumber}
        data-line={t.lineNumber}
        onClick={(e) => {
          const el = e.currentTarget;
          // :focus-visible is only set for keyboard activation, which is exactly
          // when focus restoration is wanted.
          if (el.matches(":focus-visible")) {
            const rows = listRef.current
              ? Array.from(listRef.current.querySelectorAll<HTMLElement>(":scope > .todo-row"))
              : [];
            refocus.current = { line: t.lineNumber, slot: Math.max(0, rows.indexOf(el)) };
          }
          toggle(t);
        }}
        role="checkbox"
        aria-checked={t.checked}
        aria-busy={writing}
        aria-label={`${t.checked ? "Mark incomplete" : "Mark complete"}: ${t.text}`}
      >
        <span className={`box ${t.checked ? "on" : ""}`} aria-hidden="true">{t.checked ? "✓" : ""}</span>
        <span className={`todo-t ${t.checked ? "done" : ""}`}>{t.text}</span>
      </button>
    );
  };

  return (
    <div className="next-list" ref={listRef}>
      {shownOpen.map(row)}

      {hiddenOpen > 0 && (
        <div className="todo-more">+{hiddenOpen} more in the roadmap ↓</div>
      )}

      {limit == null && doneTasks.length > 0 && (
        <div className="done-group">
          <button
            type="button"
            className={`done-toggle ${showDone ? "open" : ""}`}
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
          >
            <span className="done-caret" aria-hidden="true">▸</span>
            <span className="done-check" aria-hidden="true">✓</span>
            <span className="done-label">Completed</span>
            <span className="done-count">{doneTasks.length}</span>
          </button>
          <div className={`done-wrap ${showDone ? "open" : ""}`}>
            <div className="done-inner">
              <div className="done-list">{doneTasks.map(row)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
