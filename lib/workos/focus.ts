// IMPERIVM focus + accountability selectors.
// Implements docs/imperium/02-gamification.md §3 (the Order of the Day focus
// engine) and §4.3 (the Siege / Battle-Plan signals). Pure derivation from
// durable vault state — no save file, no invented numbers (foundation §②).

import type { Boss, Campaign, GreatSiege, RealmModel, StreakInfo } from "./types";
import { domainForName } from "./domains";
import type { Nudge } from "./derive";
import { stripMd } from "../format";

// --- types -------------------------------------------------------------------

export type OrderKind = "siege" | "vigil" | "march" | "order" | "augury" | "pax";

/** The single "what should the Imperator do right now?" answer (§3). */
export interface Order {
  text: string; // the imperative move
  href: string; // where to act
  why: string; // short rationale (the binding behind the order)
  kind: OrderKind;
}

/** One ranked critical-path action against a Siege (§4.2 stage 3). */
export interface CriticalAction {
  label: string;
  href: string;
  valor: number; // Valor (XP) the action is worth on completion
  kind: "march" | "order";
}

/** Derived Battle-Plan signals for the nearest dated threat (§4.3). */
export interface SiegeInfo {
  boss: Boss; // = the worst active Adversary (or greatSiege-derived)
  neededPerDay: number; // remaining marches ÷ max(daysLeft,1)
  criticalPath: CriticalAction[]; // ranked: campaign Marches, then domain Orders
  onPace: boolean; // can the remaining work still land in time?
}

const CRITICAL_PATH_CAP = 6;

// --- the Siege engine (§4) ---------------------------------------------------

/** The campaign a deadline-boss is bound to (`deadline:{slug}`), if any. */
function campaignForBoss(realm: RealmModel, boss: Boss): Campaign | undefined {
  if (boss.id.startsWith("deadline:")) {
    const slug = boss.id.slice("deadline:".length);
    return realm.campaigns.find((c) => c.slug === slug);
  }
  return undefined;
}

const PHASE_RANK: Record<string, number> = { active: 0, todo: 1, unknown: 2, done: 3 };

/** Remaining Marches on the boss's campaign (active first), else its domain's. */
function marchActions(realm: RealmModel, boss: Boss): CriticalAction[] {
  const bound = campaignForBoss(realm, boss);
  const campaigns = bound
    ? [bound]
    : realm.campaigns.filter((c) => domainForName(c.name) === boss.domain);

  const out: CriticalAction[] = [];
  for (const c of campaigns) {
    const phases = (c.roadmap?.phases ?? [])
      .filter((p) => p.statusKey !== "done")
      .sort((a, b) => (PHASE_RANK[a.statusKey] ?? 9) - (PHASE_RANK[b.statusKey] ?? 9));
    for (const p of phases) {
      out.push({
        label: `${c.name} · ${p.shortName}`,
        href: `/campaign/${encodeURIComponent(c.slug)}`,
        valor: 60,
        kind: "march",
      });
    }
  }
  return out;
}

/** Open Orders in Provinces on the boss's domain (§4.2 stage 2/3). */
function orderActions(realm: RealmModel, boss: Boss): CriticalAction[] {
  const out: CriticalAction[] = [];
  for (const p of realm.provinces) {
    if (domainForName(p.name) !== boss.domain) continue;
    for (const s of p.todos?.sections ?? []) {
      for (const item of s.items) {
        if (item.checked) continue;
        out.push({
          label: `${plainOrder(item.text)} · ${p.name}`,
          href: `/province/${encodeURIComponent(p.slug)}`,
          valor: 12,
          kind: "order",
        });
      }
    }
  }
  return out;
}

/** Frame the realm-level Great Siege as a Boss so the panel binds uniformly. */
function greatSiegeToBoss(gs: GreatSiege): Boss {
  return {
    id: "siege:great",
    title: gs.label,
    kind: "deadline",
    domain: "career",
    deadlineISO: gs.date,
    daysLeft: gs.daysLeft,
    state: gs.daysLeft < 0 ? "breached" : "looming",
    href: "/bosses",
    detail: `ship ${gs.date}`,
  };
}

/**
 * The nearest dated, unavoidable threat + its Battle Plan (§4.3). Returns
 * undefined when the realm is not under siege (no looming/breached Adversary
 * and no Great Siege within 14 days) — i.e. not in Bellum.
 * `bosses` is the already-sorted output of `computeBosses` (breached → looming
 * → active → defeated), so the first looming/breached entry is the worst foe.
 */
export function computeSiege(realm: RealmModel, bosses: Boss[]): SiegeInfo | undefined {
  let boss = bosses.find((b) => b.state === "breached" || b.state === "looming");
  if (!boss && realm.greatSiege && realm.greatSiege.daysLeft <= 14) {
    boss = greatSiegeToBoss(realm.greatSiege);
  }
  if (!boss) return undefined;

  const marches = marchActions(realm, boss);
  const orders = orderActions(realm, boss);
  const criticalPath = [...marches, ...orders].slice(0, CRITICAL_PATH_CAP);

  // Pace reads off the structural work (remaining Marches) the deadline rides
  // on; a pure goal-boss with no campaign falls back to its open Orders.
  const remainingWork = marches.length > 0 ? marches.length : Math.min(orders.length, CRITICAL_PATH_CAP);
  const days = boss.daysLeft != null && boss.daysLeft > 0 ? boss.daysLeft : 1;
  const neededPerDay = Math.round((remainingWork / days) * 10) / 10;
  const onPace = boss.state !== "breached" && (remainingWork === 0 || neededPerDay <= 1);

  return { boss, neededPerDay, criticalPath, onPace };
}

// --- the Order of the Day focus engine (§3) ----------------------------------

export interface OrderContext {
  nearestBoss?: Boss;
  overallStreak: StreakInfo;
  nudges: Nudge[];
  habitsToday: { id: string; label: string; domain: string; dueToday: boolean; doneToday: boolean }[];
  siege?: SiegeInfo;
}

/**
 * Resolve the single highest-leverage move for today (§3 priority cascade,
 * first hit wins). Exactly one Order — the War Table holds the full backlog.
 */
export function computeOrderOfTheDay(realm: RealmModel, ctx: OrderContext): Order {
  const { siege, overallStreak, habitsToday } = ctx;

  // 1. Siege-horn — a dated threat at the gates (≤3d) or already breached.
  if (siege) {
    const b = siege.boss;
    const breached = b.state === "breached";
    const atGates = b.daysLeft != null && b.daysLeft >= 0 && b.daysLeft <= 3;
    if (breached || atGates) {
      const next = siege.criticalPath[0];
      const tail = next ? ` ${next.label}.` : "";
      return {
        kind: "siege",
        text: breached
          ? `Hold the wall: ${b.title} — BREACHED.${tail}`
          : `Hold the wall: ${b.title} — ${dayPhrase(b.daysLeft)}.${tail}`,
        href: next?.href ?? b.href ?? "/bosses",
        why: "A dated threat is at the gates — every march now counts.",
      };
    }
  }

  // 2. Save the Vigil — protect a ≥3-day watch that hasn't been logged today.
  if (overallStreak.atRisk && overallStreak.current >= 3) {
    const due = habitsToday.find((h) => h.dueToday && !h.doneToday);
    return {
      kind: "vigil",
      text: `Keep the ${overallStreak.current}-day Vigil — log one drill.`,
      href: due ? `/zone/${due.domain}` : "/skills",
      why: "Your unbroken watch breaks if today goes unlogged.",
    };
  }

  // 3. Advance the lead — press the active march on the lead campaign.
  const lead = realm.campaigns.find(
    (c) => c.isLead && (c.roadmap?.phases ?? []).some((p) => p.statusKey === "active"),
  );
  if (lead) {
    const phase = (lead.roadmap?.phases ?? []).find((p) => p.statusKey === "active")!;
    return {
      kind: "march",
      text: `Press the march on ${lead.name} — ${phase.name}.`,
      href: `/campaign/${encodeURIComponent(lead.slug)}`,
      why: "Your lead campaign has a march underway — keep it moving.",
    };
  }

  // 4. Clear an Order — the province carrying the most open Orders.
  const prov = [...realm.provinces]
    .filter((p) => p.openQuestCount > 0)
    .sort((a, b) => b.openQuestCount - a.openQuestCount)[0];
  if (prov) {
    const item = (prov.todos?.sections ?? [])
      .flatMap((s) => s.items)
      .find((i) => !i.checked);
    return {
      kind: "order",
      text: item
        ? `Fulfil an Order in ${prov.name}: ${plainOrder(item.text)}.`
        : `Clear an Order in ${prov.name}.`,
      href: `/province/${encodeURIComponent(prov.slug)}`,
      why: `${prov.name} carries the most open orders right now.`,
    };
  }

  // 5. Re-read the Augury — the State of the Realm has grown stale.
  if (realm.hotStale) {
    return {
      kind: "augury",
      text: "The augury has grown cold — refresh the State of the Realm.",
      href: "/command",
      why: "Your last reading of the omens is stale.",
    };
  }

  // 6. Pax — surface the weekly Edict, or invite the next campaign.
  const focus = realm.now?.focus ? firstLine(realm.now.focus) : "";
  return {
    kind: "pax",
    text: focus || "The realm is calm — choose your next campaign.",
    href: "/war-table",
    why: focus ? "This week's Edict, your standing intent." : "No pressing threats across the realm.",
  };
}

// --- helpers -----------------------------------------------------------------

function dayPhrase(daysLeft?: number): string {
  if (daysLeft == null) return "imminent";
  if (daysLeft <= 0) return "due today";
  return `${daysLeft}d left`;
}

function plainOrder(text: string): string {
  return stripMd(text)
    .replace(/_\(added.*?\)_/i, "")
    .replace(/\(added.*?\)/i, "")
    .trim();
}

function firstLine(s: string): string {
  const line = s.split("\n").find((l) => l.trim()) ?? s;
  return stripMd(line);
}
