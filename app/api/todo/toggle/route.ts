import { NextResponse } from "next/server";
import { resolveInVault, toRel } from "@/lib/workos/paths";
import { readVaultFile } from "@/lib/workos/reader";
import { detectEol, writeVaultLinesCAS, VaultConflictError } from "@/lib/workos/writer";
import { withVaultLock, VaultBusyError } from "@/lib/workos/lock";
import { findTodoLine } from "@/lib/workos/anchors";
import { appendJournal } from "@/lib/workos/sidecar";

/**
 * Toggle one checkbox (a roadmap/todo task) in any vault markdown file —
 * roadmap.md, todos.md, etc. Lock-safe and coexistence-safe with other writers
 * (Obsidian, AI agents, any other consumer of the WorkOS standard):
 *  - per-file advisory lock,
 *  - re-reads fresh and resolves the target by ANCHOR (raw text) when given,
 *    falling back to the render-time lineNumber,
 *  - idempotent (no-op if already in the requested state),
 *  - compare-and-swap write (never clobbers a concurrent external edit),
 *  - journals the change to the app-local sidecar (off the Drive vault).
 *
 * On success it returns the SAME record it journalled (file, 1-based line, the
 * literal before/after checkbox marks, timestamp) so the client can show a
 * receipt of the write. The receipt is an echo of what was written, never a
 * client-side guess — it cannot claim a change the vault didn't take.
 *
 * Body: { relPath, checked, lineNumber?, expectedChecked?, text?, section? }
 */

/** Plain-language cause for a failed write, so the UI never shows a raw errno. */
function writeFailureReason(e: unknown): string {
  const code = (e as NodeJS.ErrnoException)?.code;
  if (code === "EBUSY" || code === "EPERM" || code === "EACCES") {
    return "The file is locked by another app — Drive sync or an editor has it open. Nothing was changed; try again in a moment.";
  }
  if (code === "ENOENT") {
    return "That file is no longer in the vault — it may have been moved or renamed. Nothing was changed.";
  }
  return "Couldn't write to the vault. Nothing was changed.";
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { relPath, lineNumber, expectedChecked, checked, text, section } = body ?? {};

    if (typeof relPath !== "string" || typeof checked !== "boolean") {
      return NextResponse.json({ error: "Missing relPath/checked" }, { status: 400 });
    }

    let abs: string;
    try {
      abs = resolveInVault(relPath);
    } catch {
      return NextResponse.json(
        { error: "forbidden", reason: "Path is outside the WorkOS vault." },
        { status: 403 },
      );
    }

    const result = await withVaultLock(
      abs,
      "dashboard",
      () => {
        const f = readVaultFile(abs);

        let idx: number | null = null;
        if (typeof text === "string" && text.trim()) {
          idx = findTodoLine(f.lines, text, typeof section === "string" ? section : undefined);
        }
        if (idx == null && typeof lineNumber === "number") idx = lineNumber;

        const line = idx != null ? f.lines[idx] : undefined;
        const m = line?.match(/^(\s*[-*]\s+)\[([ xX])\](.*)$/);
        if (idx == null || !m) {
          return { status: 409 as const, reason: "Checkbox not found where expected — file changed." };
        }

        const current = m[2].toLowerCase() === "x";
        // The receipt shows the literal marks, not a normalised guess — a file
        // holding `[X]` gets a receipt reading `[X]`, because that is the truth.
        const beforeMark = `[${m[2]}]`;
        const rel = toRel(abs);
        const lineNo = idx + 1; // journal/receipt are 1-based; f.lines is 0-based

        if (current === checked) {
          return {
            status: 200 as const, ok: true, checked, already: true,
            relPath: rel, line: lineNo, beforeMark, afterMark: beforeMark,
            tsISO: new Date().toISOString(),
          };
        }
        if (expectedChecked != null && current !== expectedChecked) {
          return { status: 409 as const, reason: "Task changed underneath you.", current };
        }

        const before = f.lines[idx];
        const tsISO = new Date().toISOString();
        f.lines[idx] = `${m[1]}[${checked ? "x" : " "}]${m[3]}`;
        writeVaultLinesCAS(abs, f.lines, detectEol(f.raw), { mtimeMs: f.mtimeMs, hash: f.hash });
        appendJournal({
          tsISO,
          owner: "workos-dashboard",
          relPath: rel,
          op: "toggleTask",
          before,
          after: f.lines[idx],
        });
        return {
          status: 200 as const, ok: true, checked, already: false,
          relPath: rel, line: lineNo, beforeMark, afterMark: `[${checked ? "x" : " "}]`, tsISO,
        };
      },
      { note: "toggle task" },
    );

    if (result.status === 409) {
      return NextResponse.json(
        { error: "conflict", reason: result.reason, current: "current" in result ? result.current : undefined },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof VaultConflictError) {
      return NextResponse.json(
        { error: "conflict", reason: "File changed during write — reload and retry." },
        { status: 409 },
      );
    }
    if (e instanceof VaultBusyError) {
      return NextResponse.json(
        { error: "busy", reason: "Another write is in progress — try again." },
        { status: 423 },
      );
    }
    // Never leak the raw errno/absolute path to the client — it ends up read
    // aloud by a screen reader. Log it here, hand the user a cause they can act on.
    console.error("[todo/toggle] write failed:", e);
    return NextResponse.json(
      { error: "write-failed", reason: writeFailureReason(e) },
      { status: 500 },
    );
  }
}
