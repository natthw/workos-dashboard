import path from "node:path";

/**
 * Resolved absolute path to the WorkOS vault this dashboard monitors.
 * Forward-slashed; configurable via WORKOS_PATH in .env.local.
 */
const RAW_ROOT = (process.env.WORKOS_PATH || "C:/Google Drive/My Drive/00_LifeOS/WorkOS").replace(
  /\\/g,
  "/",
);

export function getVaultRoot(): string {
  return path.resolve(RAW_ROOT);
}

/** PARA + root-file layout the scanner knows about. */
export const PARA = {
  inbox: "00_Inbox",
  // Projects live FLAT here — the `_active/` / `_archive/` split was removed from
  // the WorkOS standard 2026-06-30; completed/paused-forever projects move to
  // `04_Archive/`. Each child dir under `01_Projects/` is one project slug.
  projects: "01_Projects",
  areas: "02_Areas",
  resources: "03_Resources",
  archive: "04_Archive",
} as const;

export const ROOT_FILES = {
  hot: "hot.md",
  now: "NOW.md",
  log: "log.md",
  claude: "CLAUDE.md",
  habits: "habits.md",
  habitsLog: "habits-log.md",
  vision: "VISION.md",
} as const;

/** Sub-directories the v2 engagement loop reads/appends to. */
export const DIRS = {
  dailyNotes: "Daily_Notes",
  inbox: "00_Inbox",
} as const;

/** True if `absPath` resolves to something inside the vault (no traversal escape). */
export function isInsideVault(absPath: string): boolean {
  const root = getVaultRoot();
  const rel = path.relative(root, path.resolve(absPath));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Hard guard for every read/write. Returns the resolved absolute path, or throws
 * if the path escapes the WorkOS vault. This is what keeps CoreDB / KnowledgeOS
 * structurally untouchable from the dashboard.
 */
export function assertInsideVault(absPath: string): string {
  const resolved = path.resolve(absPath);
  if (!isInsideVault(resolved)) {
    throw new Error(`Refused: path escapes the WorkOS vault → ${absPath}`);
  }
  return resolved;
}

/** Join a vault-relative path onto the root, containment-checked. */
export function resolveInVault(relPath: string): string {
  return assertInsideVault(path.resolve(getVaultRoot(), relPath));
}

/** Absolute → vault-relative, forward-slashed. */
export function toRel(absPath: string): string {
  return path.relative(getVaultRoot(), absPath).replace(/\\/g, "/");
}
