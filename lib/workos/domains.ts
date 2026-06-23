import type { DomainKey } from "./types";

/**
 * The five fronts of the empire. Maps each WorkOS area/campaign to exactly one
 * `DomainKey` so per-domain XP always reconciles to the global total.
 *
 * Resolution order:
 *   1. exact area/campaign name match (case-insensitive, underscores → spaces)
 *   2. keyword heuristic on the name
 *   3. fallback → "personal"  (so unmapped content never silently vanishes)
 */

export interface DomainMeta {
  key: DomainKey;
  /** In-game zone name. */
  title: string;
  /** Honorific subtitle for the zone header. */
  zoneTitle2: string;
  /** lucide icon name (resolved in the UI). */
  icon: string;
  /** CSS var token for the domain accent (see globals.css). */
  accentVar: string;
  /** 2–4 letter label for the HUD mini-bars. */
  short: string;
}

export const DOMAIN_ORDER: DomainKey[] = [
  "career",
  "invest",
  "health",
  "learning",
  "personal",
];

// The five Provinces of the self (docs/imperium/00 §2, art §3.3). Display-only
// Roman names; DomainKey identifiers unchanged so XP reconciliation holds.
export const DOMAIN_META: Record<DomainKey, DomainMeta> = {
  career: {
    key: "career",
    title: "The Curia",
    zoneTitle2: "Voice of the Senate",
    icon: "Landmark",
    accentVar: "var(--color-domain-career)",
    short: "CA",
  },
  invest: {
    key: "invest",
    title: "The Aerarium",
    zoneTitle2: "Keeper of the Coin",
    icon: "Coins",
    accentVar: "var(--color-domain-invest)",
    short: "INV",
  },
  health: {
    key: "health",
    title: "The Castra",
    zoneTitle2: "Prefect of the Camp",
    icon: "Dumbbell",
    accentVar: "var(--color-domain-health)",
    short: "HP",
  },
  learning: {
    key: "learning",
    title: "The Athenaeum",
    zoneTitle2: "Scholar of the Realm",
    icon: "BookOpen",
    accentVar: "var(--color-domain-learning)",
    short: "LRN",
  },
  personal: {
    key: "personal",
    title: "The Lararium",
    zoneTitle2: "Warden of the Hearth",
    icon: "Home",
    accentVar: "var(--color-domain-personal)",
    short: "PRS",
  },
};

/** Exact area-folder names in this vault → domain. */
const NAME_TABLE: Record<string, DomainKey> = {
  career: "career",
  investments: "invest",
  health: "health",
  learning: "learning",
  personal: "personal",
};

/** Keyword fallbacks (checked when no exact name match exists). */
const KEYWORDS: { re: RegExp; domain: DomainKey }[] = [
  { re: /portfolio|wealth|invest|stock|dividend|treasury|finance|money/i, domain: "invest" },
  { re: /health|workout|fitness|nutrition|sleep|ppl|gym|body/i, domain: "health" },
  { re: /learn|japanese|study|music|piano|violin|language|academy|course/i, domain: "learning" },
  { re: /career|leadership|engineering|architecture|lseg|certification|guild|court/i, domain: "career" },
];

function norm(name: string): string {
  return name.replace(/[_-]+/g, " ").trim().toLowerCase();
}

/** Resolve any area/campaign name to a domain. Never throws; defaults personal. */
export function domainForName(name: string): DomainKey {
  const n = norm(name);
  if (NAME_TABLE[n]) return NAME_TABLE[n];
  for (const { re, domain } of KEYWORDS) if (re.test(name)) return domain;
  return "personal";
}

/** Parse a bracketed domain tag like `[health]` from a habit/goal line. */
export function domainFromTag(tag?: string): DomainKey | undefined {
  if (!tag) return undefined;
  const t = norm(tag);
  if (NAME_TABLE[t]) return NAME_TABLE[t];
  if (t === "invest" || t === "investment") return "invest";
  if (["career", "invest", "health", "learning", "personal"].includes(t)) {
    return t as DomainKey;
  }
  return undefined;
}
