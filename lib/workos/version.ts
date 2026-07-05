import fs from "node:fs";
import path from "node:path";
import { DIRS, PARA, ROOT_FILES, getVaultRoot, resolveInVault } from "./paths";
import { statMtimeMs } from "./reader";
import { listCampaignSlugs, listProvinceSlugs } from "./scan";

/**
 * Cheap freshness fingerprint of the vault: the newest mtime across every file
 * the dashboard renders from — WITHOUT reading or parsing anything. The client
 * polls this and only triggers a full re-scan (router.refresh) when it changes,
 * so we get near-live updates that respect "the vault is the source of truth"
 * and tolerate Google Drive's own sync latency. ~25 stat calls, no fs.watch
 * (which is unreliable on a Drive-mounted path on Windows).
 */
export function vaultVersion(): number {
  let max = 0;
  const bump = (m: number) => {
    if (m > max) max = m;
  };
  const root = getVaultRoot();

  for (const f of Object.values(ROOT_FILES)) bump(statMtimeMs(path.join(root, f)));

  for (const slug of listCampaignSlugs()) {
    const dir = resolveInVault(`${PARA.projects}/${slug}`);
    bump(statMtimeMs(path.join(dir, "CLAUDE.md")));
    bump(statMtimeMs(path.join(dir, "roadmap.md")));
  }

  for (const slug of listProvinceSlugs()) {
    const dir = resolveInVault(`${PARA.areas}/${slug}`);
    bump(statMtimeMs(path.join(dir, "todos.md")));
    bump(statMtimeMs(path.join(dir, "goals.md")));
  }

  // Daily_Notes: the directory mtime moves when a dated note is added/removed.
  try {
    bump(fs.statSync(resolveInVault(DIRS.dailyNotes)).mtimeMs);
  } catch {
    /* dir may not exist — ignore */
  }

  return Math.floor(max);
}
