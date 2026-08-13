"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BoardCard, BoardView } from "@/lib/board";
import { emitReceipt } from "@/lib/write-receipts";

/**
 * Next · Doing · Done, read from the `(started YYYY-MM-DD)` suffix.
 *
 * A tab beside the Eisenhower view, never a replacement: that one answers what
 * matters, this one answers what is moving. Both are wanted.
 *
 * Ticking goes through the SAME /api/todo/toggle every other checkbox uses, so
 * lock + anchor + compare-and-swap are inherited rather than reimplemented.
 * Moving a card Next→Doing would mean WRITING the `(started …)` suffix, which
 * the toggle endpoint cannot do — it flips a checkbox and nothing else. Adding
 * that is a new write operation, so it is deliberately NOT done here; the suffix
 * is set in the vault (or by an agent) and this board reads it.
 */
function Column({
  title,
  cards,
  total,
  tone,
  note,
  collapsed,
  onToggleCollapse,
  onTick,
  pending,
}: {
  title: string;
  cards: BoardCard[];
  total?: number;
  tone?: "warn";
  note?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onTick: (c: BoardCard) => void;
  pending: ReadonlySet<string>;
}) {
  const hidden = total != null ? total - cards.length : 0;
  return (
    <section className={`bcol${tone ? ` bcol-${tone}` : ""}`} aria-labelledby={`bcol-${title}`}>
      <div className="bcol-hd">
        {onToggleCollapse ? (
          <button
            type="button"
            className="bcol-h bcol-h-btn"
            id={`bcol-${title}`}
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
          >
            <span className="bcol-caret" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
            {title}
            <span className="bcol-n">{total ?? cards.length}</span>
          </button>
        ) : (
          <h3 className="bcol-h" id={`bcol-${title}`}>
            {title}
            <span className="bcol-n">{total ?? cards.length}</span>
          </h3>
        )}
      </div>
      {note && <p className="bcol-note">{note}</p>}
      {!collapsed && (
        <div className="bcol-body">
          {cards.length === 0 && <p className="bcol-empty">Nothing here.</p>}
          {cards.map((c) => (
            <div className="bcard" key={c.id}>
              <button
                type="button"
                className={`bcard-row${pending.has(c.id) ? " writing" : ""}`}
                role="checkbox"
                aria-checked={c.checked}
                aria-busy={pending.has(c.id)}
                aria-label={
                  `${c.checked ? "Mark incomplete" : "Mark complete"}: ${c.text}` +
                  ` (${c.source})` +
                  (c.ageDays != null ? `, in flight ${c.ageDays} day${c.ageDays !== 1 ? "s" : ""}` : "")
                }
                onClick={() => onTick(c)}
              >
                <span className={`box ${c.checked ? "on" : ""}`} aria-hidden="true">
                  {c.checked ? "✓" : ""}
                </span>
                <span className={`bcard-t ${c.checked ? "done" : ""}`}>{c.text}</span>
              </button>
              <div className="bcard-meta">
                {c.sourceHref ? (
                  <Link className="bcard-src" href={c.sourceHref}>{c.source}</Link>
                ) : (
                  <span className="bcard-src">{c.source}</span>
                )}
                {c.ageDays != null && (
                  <span className={`bcard-age lvl-${c.level}`} title={`In flight since ${c.started}`}>
                    {c.ageDays}d
                  </span>
                )}
              </div>
            </div>
          ))}
          {hidden > 0 && (
            <div className="todo-more">
              +{hidden} more not shown — open a project to see the rest
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function Board({ board }: { board: BoardView }) {
  const [cards, setCards] = useState(board);
  const [synced, setSynced] = useState(board);
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [doneOpen, setDoneOpen] = useState(false);
  const router = useRouter();

  // Adopt fresh server state after router.refresh(), unless a write is in
  // flight — same rule as TaskChecklist and WaitingStrip.
  if (board !== synced && pending.size === 0) {
    setSynced(board);
    setCards(board);
  }

  const mark = (set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> => {
    const nx = new Set(set);
    if (on) nx.add(id);
    else nx.delete(id);
    return nx;
  };

  async function tick(c: BoardCard) {
    if (pending.has(c.id)) return;
    const next = !c.checked;
    setPending((s) => mark(s, c.id, true));
    const patch = (checked: boolean) =>
      setCards((b) => ({
        ...b,
        next: b.next.map((x) => (x.id === c.id ? { ...x, checked } : x)),
        doing: b.doing.map((x) => (x.id === c.id ? { ...x, checked } : x)),
        done: b.done.map((x) => (x.id === c.id ? { ...x, checked } : x)),
      }));
    patch(next);
    try {
      const r = await fetch("/api/todo/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relPath: c.relPath,
          lineNumber: c.lineNumber,
          text: c.anchor,
          section: c.section,
          expectedChecked: c.checked,
          checked: next,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.reason || `The write failed (HTTP ${r.status}).`);
      emitReceipt({
        kind: j.already ? "nochange" : "wrote",
        file: (j.relPath ?? c.relPath).split("/").slice(-2).join("/"),
        line: j.line ?? c.lineNumber + 1,
        beforeMark: j.beforeMark,
        afterMark: j.afterMark,
        text: c.text,
        tsISO: j.tsISO,
      });
      router.refresh();
    } catch (e) {
      patch(c.checked);
      emitReceipt({
        kind: "failed",
        file: c.relPath.split("/").slice(-2).join("/"),
        line: c.lineNumber + 1,
        text: c.text,
        reason: e instanceof Error ? e.message : "Couldn't save. Nothing was changed.",
        onRetry: () => tick(c),
      });
    } finally {
      setPending((s) => mark(s, c.id, false));
    }
  }

  const doing = cards.doing.filter((c) => !c.checked);
  const over = doing.length > cards.wipCap;

  return (
    <div className="board">
      <Column
        title="Next"
        cards={cards.next.filter((c) => !c.checked)}
        total={cards.nextTotal}
        onTick={tick}
        pending={pending}
      />
      <Column
        title="Doing"
        cards={doing}
        tone={over ? "warn" : undefined}
        // The exact question how-to-advise-me.md says to ask: name the breach,
        // then hand the decision back rather than ranking his work for him.
        note={
          over
            ? `${doing.length} in flight — one-active-build says 1 build. What comes off?`
            : undefined
        }
        onTick={tick}
        pending={pending}
      />
      <Column
        title="Done"
        cards={cards.done.filter((c) => c.checked)}
        total={cards.doneTotal}
        collapsed={!doneOpen}
        onToggleCollapse={() => setDoneOpen((v) => !v)}
        onTick={tick}
        pending={pending}
      />
    </div>
  );
}
