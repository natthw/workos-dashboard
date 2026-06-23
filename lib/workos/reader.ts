import fs from "node:fs";
import crypto from "node:crypto";
import matter from "gray-matter";
import { assertInsideVault, toRel } from "./paths";

export interface ReadResult {
  frontmatter: Record<string, unknown>;
  body: string;
  raw: string;
  lines: string[]; // raw split on newlines — line indices map to the real file
  absPath: string;
  relPath: string;
  mtimeMs: number;
  hash: string; // sha1 of raw — the authoritative fingerprint for compare-and-swap writes
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** sha1 of a string — cheap content fingerprint (collision-irrelevant here). */
export function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

/** Read + parse a markdown file inside the vault. Throws if outside the vault. */
export function readVaultFile(absPath: string): ReadResult {
  const p = assertInsideVault(absPath);
  const raw = stripBom(fs.readFileSync(p, "utf8"));
  const stat = fs.statSync(p);
  const parsed = matter(raw);
  return {
    frontmatter: (parsed.data as Record<string, unknown>) ?? {},
    body: parsed.content,
    raw,
    lines: raw.split(/\r?\n/),
    absPath: p,
    relPath: toRel(p),
    mtimeMs: stat.mtimeMs,
    hash: sha1(raw),
  };
}

/** Non-throwing variant — returns null if the file is missing or unreadable. */
export function safeRead(absPath: string): ReadResult | null {
  try {
    return readVaultFile(absPath);
  } catch {
    return null;
  }
}

export function fileExists(absPath: string): boolean {
  try {
    return fs.existsSync(assertInsideVault(absPath));
  } catch {
    return false;
  }
}

export function statMtimeMs(absPath: string): number {
  try {
    return fs.statSync(assertInsideVault(absPath)).mtimeMs;
  } catch {
    return 0;
  }
}
