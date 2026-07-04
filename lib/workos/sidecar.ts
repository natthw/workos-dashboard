import fs from "node:fs";
import path from "node:path";

/**
 * App-local sidecar store — for data that must NOT live in the (Drive-synced)
 * WorkOS vault: the write journal, last-seen markers, acknowledgements, and any
 * future app-only state (e.g. skill-point allocations). Keeping it here means
 * the vault stays the clean source of truth an LLM agent edits, and Drive never
 * syncs dashboard bookkeeping.
 *
 * Defaults to `<app>/.workos-data`; override with `WORKOS_DATA_PATH`.
 */
export function sidecarDir(): string {
  const raw =
    process.env.WORKOS_DATA_PATH || path.join(process.cwd(), ".workos-data");
  const dir = path.resolve(raw.replace(/\\/g, "/"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface JournalEntry {
  tsISO: string;
  owner: string; // "dashboard" | "agent:<name>"
  relPath: string; // vault-relative path that was edited
  op: string; // "toggleOrder" | "cyclePhase" | ...
  before?: string;
  after?: string;
  note?: string;
}

/**
 * Append one NDJSON line to the app-local write journal. Best-effort: a journal
 * failure never fails the underlying write. Used for audit and recovery.
 */
export function appendJournal(entry: JournalEntry): void {
  try {
    const p = path.join(sidecarDir(), "journal.ndjson");
    fs.appendFileSync(p, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    /* journal is best-effort */
  }
}
