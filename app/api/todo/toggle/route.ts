import { NextResponse } from "next/server";
import { resolveInVault, toRel } from "@/lib/workos/paths";
import { readVaultFile } from "@/lib/workos/reader";
import { detectEol, writeVaultLinesCAS, VaultConflictError } from "@/lib/workos/writer";
import { withVaultLock, VaultBusyError } from "@/lib/workos/lock";
import { findTodoLine } from "@/lib/workos/anchors";
import { appendJournal } from "@/lib/workos/sidecar";

/**
 * Toggle one checkbox ("chunk task") in any vault markdown file — roadmap.md,
 * todos.md, etc. Lock-safe and coexistence-safe with other writers (Obsidian,
 * AI agents, the old Sovereign app):
 *  - per-file advisory lock,
 *  - re-reads fresh and resolves the target by ANCHOR (raw text) when given,
 *    falling back to the render-time lineNumber,
 *  - idempotent (no-op if already in the requested state),
 *  - compare-and-swap write (never clobbers a concurrent external edit),
 *  - journals the change to the app-local sidecar (off the Drive vault).
 *
 * Body: { relPath, checked, lineNumber?, expectedChecked?, text?, section? }
 */
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
        if (current === checked) {
          return { status: 200 as const, ok: true, checked, already: true };
        }
        if (expectedChecked != null && current !== expectedChecked) {
          return { status: 409 as const, reason: "Task changed underneath you.", current };
        }

        const before = f.lines[idx];
        f.lines[idx] = `${m[1]}[${checked ? "x" : " "}]${m[3]}`;
        writeVaultLinesCAS(abs, f.lines, detectEol(f.raw), { mtimeMs: f.mtimeMs, hash: f.hash });
        appendJournal({
          tsISO: new Date().toISOString(),
          owner: "tracker",
          relPath: toRel(abs),
          op: "toggleTask",
          before,
          after: f.lines[idx],
        });
        return { status: 200 as const, ok: true, checked, already: false };
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
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
