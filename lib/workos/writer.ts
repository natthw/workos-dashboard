import fs from "node:fs";
import path from "node:path";
import { assertInsideVault, toRel } from "./paths";
import { sha1 } from "./reader";

/** Detect the dominant line ending so write-backs preserve the file's style. */
export function detectEol(raw: string): string {
  return raw.includes("\r\n") ? "\r\n" : "\n";
}

/** Thrown when a file changed between the read we based the edit on and the write. */
export class VaultConflictError extends Error {
  constructor(readonly relPath: string) {
    super(`Vault file changed under us: ${relPath}`);
    this.name = "VaultConflictError";
  }
}

/**
 * Crash-safe write: write to a temp sibling then atomically rename over the
 * target. `rename` is atomic on the same volume, so a reader (or an LLM agent)
 * never observes a half-written file, even on process death mid-write.
 */
export function atomicWrite(absPath: string, data: string): void {
  const p = assertInsideVault(absPath);
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, data, "utf8");
  try {
    fs.renameSync(tmp, p);
  } catch (e) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* ignore cleanup failure */
    }
    throw e;
  }
}

/**
 * Write `lines` back to a vault file, containment-checked. Routes through
 * `atomicWrite` so a crash can't leave a torn file.
 *
 * `lines` is the array produced by splitting the original raw on /\r?\n/, so a
 * trailing newline is already represented by a trailing "" element — joining
 * with the detected EOL reproduces the file faithfully (only the edited line
 * differs).
 */
export function writeVaultLines(absPath: string, lines: string[], eol: string): void {
  const p = assertInsideVault(absPath);
  atomicWrite(p, lines.join(eol));
}

/**
 * Compare-and-swap write: write `lines` only if the file on disk still matches
 * the fingerprint captured at read time. If anything edited it in between
 * (e.g. an LLM agent), throw `VaultConflictError` instead of clobbering.
 *
 * `hash` is authoritative; `mtimeMs` is a fast pre-check. Call this from inside
 * a `withVaultLock` after a fresh read for defense-in-depth.
 */
export function writeVaultLinesCAS(
  absPath: string,
  lines: string[],
  eol: string,
  expect: { mtimeMs: number; hash: string },
): void {
  const p = assertInsideVault(absPath);
  const cur = fs.readFileSync(p, "utf8");
  const curHash = sha1(cur.charCodeAt(0) === 0xfeff ? cur.slice(1) : cur);
  const curMtime = fs.statSync(p).mtimeMs;
  if (curHash !== expect.hash || curMtime !== expect.mtimeMs) {
    throw new VaultConflictError(toRel(p));
  }
  atomicWrite(p, lines.join(eol));
}

/**
 * Append a block of text to a vault file (creating it if absent), preserving the
 * file's dominant line ending and guaranteeing exactly one separating newline.
 * Containment-checked. Never overwrites existing content.
 */
export function appendToVaultFile(absPath: string, text: string): void {
  const p = assertInsideVault(absPath);
  let existing = "";
  try {
    existing = fs.readFileSync(p, "utf8");
  } catch {
    existing = "";
  }
  const eol = detectEol(existing || text);
  const normalized = text.replace(/\r?\n/g, eol);
  let out: string;
  if (existing === "") {
    out = normalized;
  } else {
    const sep = existing.endsWith(eol) ? "" : eol;
    out = existing + sep + normalized;
  }
  if (!out.endsWith(eol)) out += eol;
  fs.writeFileSync(p, out, "utf8");
}

/** Create a brand-new vault file. Throws if it already exists (no overwrite). */
export function createVaultFile(absPath: string, content: string): void {
  const p = assertInsideVault(absPath);
  if (fs.existsSync(p)) {
    throw new Error("File already exists");
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, { encoding: "utf8", flag: "wx" });
}

/** True if a vault file exists (containment-checked). */
export function vaultFileExists(absPath: string): boolean {
  try {
    return fs.existsSync(assertInsideVault(absPath));
  } catch {
    return false;
  }
}
