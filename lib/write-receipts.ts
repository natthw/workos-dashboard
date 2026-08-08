/**
 * Write-receipt store — the queue behind <WriteReceipts />.
 *
 * A tiny module-level pub/sub rather than React context: every TaskChecklist on
 * the page (one per phase, plus the Most-important panel) feeds ONE ledger, and
 * threading a provider through two server-rendered routes to achieve that would
 * be ceremony for no gain.
 *
 * Kept out of the component file on purpose. Co-locating non-component exports
 * with a component breaks Fast Refresh — Next falls back to a full page reload on
 * every edit, which is a bad trade for a repo whose owner edits it daily.
 */

export type ReceiptKind = "wrote" | "nochange" | "failed";

export interface Receipt {
  id: number;
  kind: ReceiptKind;
  /** Display path, e.g. `Personal_Finance/roadmap.md`. */
  file: string;
  /** 1-based line in that file. */
  line: number;
  /** Literal marks straight from the file, e.g. `[ ]` and `[x]`. */
  beforeMark?: string;
  afterMark?: string;
  /** The task's own text. */
  text: string;
  /** Journal timestamp (ISO) — rendered as local wall-clock. */
  tsISO?: string;
  /** Plain-language cause, on failure. */
  reason?: string;
  /** Re-runs the write that failed. */
  onRetry?: () => void;
}

type Listener = (all: Receipt[]) => void;

let receipts: Receipt[] = [];
let listeners: Listener[] = [];
let nextId = 1;

/** Newest first, capped — a ledger corner, not a log window. */
const MAX_VISIBLE = 3;
/** Successes fade on their own; failures wait to be dealt with. */
const AUTO_DISMISS_MS = 5200;

function publish(): void {
  for (const l of listeners) l(receipts);
}

export function getReceipts(): Receipt[] {
  return receipts;
}

export function subscribeReceipts(l: Listener): () => void {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export function dismissReceipt(id: number): void {
  receipts = receipts.filter((r) => r.id !== id);
  publish();
}

export function emitReceipt(r: Omit<Receipt, "id">): number {
  const id = nextId++;
  receipts = [{ ...r, id }, ...receipts].slice(0, MAX_VISIBLE);
  publish();
  if (r.kind !== "failed") setTimeout(() => dismissReceipt(id), AUTO_DISMISS_MS);
  return id;
}
