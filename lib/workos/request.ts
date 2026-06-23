import { cache } from "react";
import { scanRealm } from "./scan";
import { buildHud, type HudData } from "./hud";
import type { RealmModel } from "./types";

/**
 * Request-scoped realm + HUD reads.
 *
 * Every page already calls `scanRealm()` under `export const dynamic =
 * "force-dynamic"`, and `EmpireWorld` (mounted globally in `app/layout.tsx`)
 * needs the same data. React `cache()` dedupes the filesystem scan to **once
 * per request**, so the global banner and the page share a single read instead
 * of scanning the vault twice. Server-only (both wrap fs-backed readers).
 */
export const getRealm = cache((): RealmModel => scanRealm());

export const getHud = cache((): HudData => buildHud(getRealm()));
