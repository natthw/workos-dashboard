"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WaitingView, WaitingItemView } from "@/lib/view";
import { emitReceipt } from "@/lib/write-receipts";

/**
 * `WAITING.md` — what the work is waiting on from you. The inverse of the focus
 * panel: that one is what you owe the work.
 *
 * Shape is a COLLAPSIBLE STRIP, not a band (owner's call, 2026-08-13). The band
 * this replaces would have stacked a permanent row-block above the projects,
 * which is the one shape this app's direction rules out — it compacts sections
 * so the work sits above the fold. At rest the strip is a single line carrying
 * the two facts that matter: how many chains are stopped, and how long the
 * oldest has been stopped. Everything else is one click away.
 *
 * It renders NOTHING when the ledger is empty. Empty is the goal, so the
 * surface must cost nothing when the goal is met.
 *
 * Ticking goes through the SAME /api/todo/toggle as every other checkbox — no
 * second write path exists, so lock + anchor + compare-and-swap are inherited
 * rather than reimplemented. Ticked items stay on screen (they leave the file
 * when the line is deleted, not when it is ticked), which is what makes a
 * mis-tap on a phone reversible in place.
 */
export function WaitingStrip({
  waiting,
  initialOpen,
  onOpenChange,
}: {
  waiting?: WaitingView;
  initialOpen?: boolean;
  /** Persisting the disclosure is the caller's job — one cookie writer, in Dashboard. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(!!initialOpen);
  const [items, setItems] = useState<WaitingItemView[]>(waiting?.items ?? []);
  const [synced, setSynced] = useState(waiting?.items);
  const [pending, setPending] = useState<ReadonlySet<number>>(() => new Set());
  const router = useRouter();

  // Adopt fresh server state after router.refresh() (our own write, or the
  // freshness probe noticing an edit made in Obsidian) — held back while a write
  // is in flight so a re-render can't clobber the optimistic row. Same rule as
  // TaskChecklist.
  if (waiting?.items && waiting.items !== synced && pending.size === 0) {
    setSynced(waiting.items);
    setItems(waiting.items);
  }

  if (!waiting || items.length === 0) return null;

  const mark = (set: ReadonlySet<number>, line: number, on: boolean): ReadonlySet<number> => {
    const next = new Set(set);
    if (on) next.add(line);
    else next.delete(line);
    return next;
  };

  async function toggle(it: WaitingItemView) {
    if (!waiting) return;
    if (pending.has(it.lineNumber)) return; // only guards double-firing the SAME row
    const next = !it.checked;
    setPending((s) => mark(s, it.lineNumber, true));
    setItems((xs) =>
      xs.map((x) => (x.lineNumber === it.lineNumber ? { ...x, checked: next } : x)),
    );
    try {
      const r = await fetch("/api/todo/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relPath: waiting.relPath,
          lineNumber: it.lineNumber,
          text: it.raw,
          section: waiting.section,
          expectedChecked: it.checked,
          checked: next,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.reason || `The write failed (HTTP ${r.status}).`);

      emitReceipt({
        kind: j.already ? "nochange" : "wrote",
        file: (j.relPath ?? waiting.relPath).split("/").slice(-2).join("/"),
        line: j.line ?? it.lineNumber + 1,
        beforeMark: j.beforeMark,
        afterMark: j.afterMark,
        text: it.text,
        tsISO: j.tsISO,
      });
      router.refresh();
    } catch (e) {
      setItems((xs) =>
        xs.map((x) => (x.lineNumber === it.lineNumber ? { ...x, checked: it.checked } : x)),
      );
      emitReceipt({
        kind: "failed",
        file: waiting.relPath.split("/").slice(-2).join("/"),
        line: it.lineNumber + 1,
        text: it.text,
        reason: e instanceof Error ? e.message : "Couldn't save. Nothing was changed.",
        onRetry: () => toggle(it),
      });
    } finally {
      setPending((s) => mark(s, it.lineNumber, false));
    }
  }

  const openItems = items.filter((i) => !i.checked);
  const clearedItems = items.filter((i) => i.checked);
  // Recomputed from local state, not the server view, so the headline follows an
  // optimistic tick instead of lagging a round-trip behind it.
  const openAges = openItems.map((i) => i.ageDays).filter((d): d is number => d != null);
  const oldest = openAges.length ? Math.max(...openAges) : undefined;
  const level = oldest != null ? waiting.items.find((i) => i.ageDays === oldest)?.level : undefined;

  const summary =
    openItems.length === 0
      ? "all clear"
      : `${openItems.length} blocked${oldest != null ? `, oldest ${oldest} day${oldest !== 1 ? "s" : ""}` : ""}`;

  return (
    <section className={`waiting lvl-${level ?? "fresh"}`} aria-labelledby="waiting-h">
      <h2 className="vh" id="waiting-h">Blocked on you</h2>
      <button
        type="button"
        className={`waiting-bar${open ? " open" : ""}`}
        aria-expanded={open}
        aria-controls={open ? "waiting-list" : undefined}
        aria-label={`Blocked on you: ${summary}`}
        onClick={() => { setOpen(!open); onOpenChange?.(!open); }}
      >
        <span className="waiting-icon" aria-hidden="true">⏳</span>
        <span className="waiting-label" aria-hidden="true">Blocked on you</span>
        {openItems.length > 0 && (
          <span className="waiting-count" aria-hidden="true">{openItems.length}</span>
        )}
        {oldest != null && (
          <span className={`waiting-age lvl-${level ?? "fresh"}`} aria-hidden="true">
            oldest {oldest}d
          </span>
        )}
        <span className="spacer" />
        <span className="waiting-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="waiting-list" id="waiting-list">
          {[...openItems, ...clearedItems].map((it) => (
            <div className="waiting-item" key={it.lineNumber}>
              <button
                type="button"
                className={`todo-row waiting-row${pending.has(it.lineNumber) ? " writing" : ""}`}
                role="checkbox"
                aria-checked={it.checked}
                aria-busy={pending.has(it.lineNumber)}
                aria-label={
                  `${it.checked ? "Reopen" : "Mark cleared"}: ${it.text}` +
                  (it.ageDays != null ? `, waiting ${it.ageDays} day${it.ageDays !== 1 ? "s" : ""}` : "") +
                  (it.how ? `. Start by: ${it.how}` : "")
                }
                onClick={() => toggle(it)}
              >
                <span className={`box ${it.checked ? "on" : ""}`} aria-hidden="true">
                  {it.checked ? "✓" : ""}
                </span>
                <span className={`todo-t ${it.checked ? "done" : ""}`}>{it.text}</span>
                {it.ageDays != null && (
                  <span className={`waiting-item-age lvl-${it.level}`} aria-hidden="true">
                    {it.ageDays}d
                  </span>
                )}
              </button>
              {/* `how:` is the payload of the whole contract — the bottleneck is
                  the start-line, so the fix is naming a first concrete move. */}
              {it.how && !it.checked && (
                <div className="waiting-how">
                  <span className="waiting-how-k" aria-hidden="true">how</span>
                  {it.how}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
