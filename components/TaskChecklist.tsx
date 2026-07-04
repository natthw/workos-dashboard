"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChunkTask } from "@/lib/roadmap-tasks";

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
 */
export function TaskChecklist({ relPath, tasks: initial }: { relPath: string; tasks: ChunkTask[] }) {
  const [tasks, setTasks] = useState<ChunkTask[]>(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const router = useRouter();

  async function toggle(t: ChunkTask) {
    if (busy != null) return;
    const next = !t.checked;
    setBusy(t.lineNumber);
    setErr(null);
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
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.reason || `HTTP ${r.status}`);
      }
      // Re-pull server-rendered aggregates (progress %, phase/sub-project counts)
      // so they reflect the write, not just this checkbox's local state.
      router.refresh();
    } catch (e) {
      setTasks((ts) => ts.map((x) => (x.lineNumber === t.lineNumber ? { ...x, checked: t.checked } : x)));
      setErr(e instanceof Error ? e.message : "Could not save — try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!tasks.length) return null;

  const openTasks = tasks.filter((t) => !t.checked);
  const doneTasks = tasks.filter((t) => t.checked);

  const row = (t: ChunkTask) => (
    <button
      type="button"
      className="todo-row"
      key={t.lineNumber}
      onClick={() => toggle(t)}
      disabled={busy === t.lineNumber}
      role="checkbox"
      aria-checked={t.checked}
      aria-label={`${t.checked ? "Mark incomplete" : "Mark complete"}: ${t.text}`}
      style={{ opacity: busy === t.lineNumber ? 0.55 : 1 }}
    >
      <span className={`box ${t.checked ? "on" : ""}`} aria-hidden="true">{t.checked ? "✓" : ""}</span>
      <span className={`todo-t ${t.checked ? "done" : ""}`}>{t.text}</span>
    </button>
  );

  return (
    <div className="next-list">
      {openTasks.map(row)}

      {doneTasks.length > 0 && (
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

      {err && <div className="mini-m" role="alert" style={{ color: "#b1492f", paddingTop: 6 }}>⚠ {err}</div>}
    </div>
  );
}
