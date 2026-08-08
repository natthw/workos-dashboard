"use client";

import { useEffect, useState } from "react";
import {
  dismissReceipt,
  getReceipts,
  subscribeReceipts,
  type Receipt,
} from "@/lib/write-receipts";

/**
 * Write receipts — the vault acknowledging, in its own language.
 *
 * Ticking a checkbox is the one action in this app that changes a file on disk.
 * Until now it produced no visible result at all: the row repainted and that was
 * the whole confirmation, which made a silently-dropped write indistinguishable
 * from a successful one.
 *
 * A receipt renders the record the API actually journalled — file, 1-based line,
 * and the literal before/after checkbox marks (`[ ] → [x]`). Nothing here is
 * reconstructed client-side, so a receipt cannot describe a write the vault
 * didn't take. That is the point: the app's whole trust proposition is honest
 * write-back, so the proof is the substrate itself, shown as markdown.
 */

function useReceipts(): Receipt[] {
  const [all, setAll] = useState<Receipt[]>([]);
  useEffect(() => {
    setAll(getReceipts()); // adopt anything emitted between module load and mount
    return subscribeReceipts(setAll);
  }, []);
  return all;
}

function clockOf(tsISO?: string): string | null {
  if (!tsISO) return null;
  const d = new Date(tsISO);
  if (Number.isNaN(d.getTime())) return null;
  // 24h regardless of locale: this is a log stamp sitting next to a file path and
  // a line number, and it reads as one with them.
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

/**
 * Mount once (in the root layout). Renders nothing until a write happens, so it
 * costs no layout and can't mismatch on hydration.
 */
export function WriteReceipts() {
  const all = useReceipts();
  if (!all.length) return null;

  return (
    <div className="receipts">
      {/* Successes are polite; a failed write interrupts (role="alert" below),
          because it means the vault does not say what the screen says. */}
      <div className="vh" role="status" aria-live="polite">
        {all
          .filter((r) => r.kind !== "failed")
          .map((r) => (
            <p key={r.id}>
              {r.kind === "wrote"
                ? `Wrote ${r.beforeMark} to ${r.afterMark} on line ${r.line} of ${r.file}: ${r.text}`
                : `No change needed on line ${r.line} of ${r.file}: ${r.text} was already ${r.afterMark}.`}
            </p>
          ))}
      </div>

      {all.map((r) => (
        <div key={r.id} className={`receipt receipt-${r.kind}`}>
          <div className="rc-head">
            <span className="rc-path">
              {r.file}
              <span className="rc-line">:{r.line}</span>
            </span>
            <span className="rc-stamp">
              {r.kind === "failed" ? "not saved" : r.kind === "nochange" ? "no change" : clockOf(r.tsISO) ?? "wrote"}
            </span>
          </div>

          {r.kind === "failed" ? (
            <>
              <p className="rc-reason" role="alert">{r.reason}</p>
              <p className="rc-text">{r.text}</p>
              <div className="rc-actions">
                {r.onRetry && (
                  <button
                    type="button"
                    className="rc-btn rc-btn-primary"
                    onClick={() => {
                      dismissReceipt(r.id);
                      r.onRetry?.();
                    }}
                  >
                    Try again
                  </button>
                )}
                <button type="button" className="rc-btn" onClick={() => dismissReceipt(r.id)}>
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="rc-diff" aria-hidden="true">
                <span className="rc-mark">{r.beforeMark}</span>
                <span className="rc-arrow">→</span>
                <span className={`rc-mark ${r.kind === "wrote" ? "rc-mark-new" : ""}`}>{r.afterMark}</span>
              </p>
              <p className="rc-text">{r.text}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
