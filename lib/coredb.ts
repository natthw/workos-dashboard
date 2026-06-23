import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getVaultRoot } from "./workos/paths";
import type { HoldingsData } from "./workos/types";

/**
 * Read-only access to the CoreDB export that lives in KnowledgeOS/context.
 *
 * This is the *sanctioned* cross-system read path in the LifeOS architecture
 * ("the vaults may read portfolio data via the context export"). The dashboard
 * only ever READS it and displays it live — it never writes here and never
 * copies the figures into WorkOS files ("reference CoreDB facts, never cache").
 */
function contextDir(): string {
  if (process.env.KNOWLEDGE_CONTEXT_PATH) {
    return path.resolve(process.env.KNOWLEDGE_CONTEXT_PATH.replace(/\\/g, "/"));
  }
  // Default: KnowledgeOS/context as a sibling of the WorkOS vault.
  return path.resolve(path.dirname(getVaultRoot()), "KnowledgeOS", "context");
}

export interface TreasuryData {
  generated?: string;
  body: string;
  holdingsCount: number;
  markets: { market: string; count: number }[];
  source: string;
}

export function readTreasury(): TreasuryData | null {
  const invPath = path.join(contextDir(), "investment-context.md");
  let raw: string;
  try {
    raw = fs.readFileSync(invPath, "utf8");
  } catch {
    return null;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const parsed = matter(raw);
  const body = parsed.content;

  // Parse the "Current Holdings" table for a count + market breakdown.
  const counts = new Map<string, number>();
  let inTable = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^##\s+Current Holdings/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /^##\s+/.test(line)) break;
    if (inTable && line.startsWith("|")) {
      const cells = line.split("|").map((s) => s.trim());
      const market = cells[1];
      if (!market || /^-+$/.test(market) || market.toLowerCase() === "market") continue;
      counts.set(market, (counts.get(market) ?? 0) + 1);
    }
  }

  const markets = [...counts.entries()]
    .map(([market, count]) => ({ market, count }))
    .sort((a, b) => b.count - a.count);
  const holdingsCount = markets.reduce((n, m) => n + m.count, 0);

  // YAML auto-parses `generated: 2026-06-04` into a Date — normalise to a string.
  const genRaw = (parsed.data as Record<string, unknown>).generated;
  const generated =
    genRaw instanceof Date
      ? genRaw.toISOString().slice(0, 10)
      : typeof genRaw === "string"
        ? genRaw
        : undefined;

  return {
    generated,
    body,
    holdingsCount,
    markets,
    source: invPath,
  };
}

// --- structured holdings (FR6.1, FR6.3, FR6.4) -------------------------------

interface RawHolding {
  market?: string;
  ticker?: string;
  quantity?: number;
  total_cost?: number;
  dividends?: number;
  currency?: string;
}

/**
 * Read the structured `holdings.json` export for value, dividends, market
 * diversification and milestones — strictly READ-ONLY ("reference, never cache").
 * Returns null if the export is absent, so callers degrade gracefully.
 */
export function readHoldings(): HoldingsData | null {
  const jsonPath = path.join(contextDir(), "holdings.json");
  let raw: string;
  try {
    raw = fs.readFileSync(jsonPath, "utf8");
  } catch {
    return null;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  let parsed: { generated?: string; holdings?: RawHolding[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const holdings = parsed.holdings ?? [];

  // Group cost basis + dividends per currency.
  const ccy = new Map<string, { totalCost: number; dividends: number }>();
  const mkt = new Map<string, number>();
  const recentDividends: HoldingsData["recentDividends"] = [];

  for (const h of holdings) {
    const c = (h.currency ?? "—").toUpperCase();
    const acc = ccy.get(c) ?? { totalCost: 0, dividends: 0 };
    acc.totalCost += h.total_cost ?? 0;
    acc.dividends += h.dividends ?? 0;
    ccy.set(c, acc);

    const m = h.market ?? "—";
    mkt.set(m, (mkt.get(m) ?? 0) + 1);

    if ((h.dividends ?? 0) > 0) {
      recentDividends.push({
        symbol: h.ticker ?? h.market ?? "?",
        amount: h.dividends as number,
        ccy: c,
        date: parsed.generated ?? "",
      });
    }
  }

  const byCurrency = [...ccy.entries()]
    .map(([c, v]) => ({ ccy: c, totalCost: round2(v.totalCost), dividends: round2(v.dividends) }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const positions = holdings.length;
  const byMarket = [...mkt.entries()]
    .map(([market, count]) => ({ market, count, weight: positions ? count / positions : 0 }))
    .sort((a, b) => b.count - a.count);

  recentDividends.sort((a, b) => b.amount - a.amount);

  const markets = byMarket.length;
  const milestones = deriveHoldingMilestones(positions, markets, parsed.generated);

  return {
    generated: parsed.generated,
    byCurrency,
    positions,
    markets,
    recentDividends: recentDividends.slice(0, 6),
    byMarket,
    milestones,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deriveHoldingMilestones(
  positions: number,
  markets: number,
  date?: string,
): HoldingsData["milestones"] {
  const tiers = [1, 10, 25, 50, 100];
  const out: HoldingsData["milestones"] = tiers.map((t) => ({
    id: `pos-${t}`,
    label: t === 1 ? "First holding" : `${t} positions`,
    crossed: positions >= t,
    date: positions >= t ? date : undefined,
  }));
  for (const t of [3, 6, 11]) {
    out.push({
      id: `mkt-${t}`,
      label: `${t} markets`,
      crossed: markets >= t,
      date: markets >= t ? date : undefined,
    });
  }
  return out;
}
