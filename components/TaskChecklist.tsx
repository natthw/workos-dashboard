"use client";

import { useState } from "react";
import type { ChunkTask } from "@/lib/roadmap-tasks";

/**
 * Interactive checkbox list for a phase's chunk tasks. Toggling writes back to
 * the WorkOS roadmap.md (lock-safe, compare-and-swap) via /api/todo/toggle.
 * Optimistic update; reverts on conflict/error.
 */
export function TaskChecklist({ relPath, tasks: initial }: { relPath: string; tasks: ChunkTask[] }) {
  const [tasks, setTasks] = useState<ChunkTask[]>(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e) {
      setTasks((ts) => ts.map((x) => (x.lineNumber === t.lineNumber ? { ...x, checked: t.checked } : x)));
      setErr(e instanceof Error ? e.message : "Could not save — try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!tasks.length) return null;

  return (
    <div className="next-list">
      {tasks.map((t) => (
        <div
          className="todo-row"
          key={t.lineNumber}
          onClick={() => toggle(t)}
          style={{ cursor: "pointer", opacity: busy === t.lineNumber ? 0.55 : 1 }}
          role="checkbox"
          aria-checked={t.checked}
        >
          <span className={`box ${t.checked ? "on" : ""}`}>{t.checked ? "✓" : ""}</span>
          <span className={`todo-t ${t.checked ? "done" : ""}`}>{t.text}</span>
        </div>
      ))}
      {err && <div className="mini-m" style={{ color: "#b1492f", paddingTop: 6 }}>⚠ {err}</div>}
    </div>
  );
}
