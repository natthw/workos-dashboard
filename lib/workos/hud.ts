import type { Boss, DomainProgress, RealmModel, StreakInfo } from "./types";
import { computeDomainProgress, computeProgress, type RealmProgress } from "./gamification";
import {
  computeBosses,
  computeHabitsToday,
  computeNudges,
  computeStreaks,
  nearestBoss,
  streakFor,
  type Nudge,
} from "./derive";
import { computeOrderOfTheDay, computeSiege, type Order, type SiegeInfo } from "./focus";
import { readTreasury } from "../coredb";

export interface HudData {
  progress: RealmProgress;
  domains: DomainProgress[];
  overallStreak: StreakInfo;
  nearestBoss?: Boss;
  nudges: Nudge[];
  // --- EmpireWorld additions (05-data-binding.md) ------------------------------
  /** Lifted from the ad-hoc per-page computations so the banner stays thin. */
  counts: { dueQuests: number; activePhases: number };
  /** Portfolio snapshot for the Treasury/Merchant hotspots (null-safe export). */
  treasury?: { holdingsCount: number; markets: number };
  // --- IMPERIVM gamification selectors (docs/imperium/02 §3, §4.3) -------------
  /** Today's single highest-leverage move (the Order of the Day focus engine). */
  orderOfTheDay: Order;
  /** Battle-Plan signals for the nearest dated threat; absent unless in Bellum. */
  siege?: SiegeInfo;
}

/** Assemble everything the persistent HUD needs from a single realm scan. */
export function buildHud(realm: RealmModel): HudData {
  const progress = computeProgress(realm);
  const domains = computeDomainProgress(realm);
  const streaks = computeStreaks(realm);
  const bosses = computeBosses(realm);
  const habitsToday = computeHabitsToday(realm);
  const nudges = computeNudges(realm, streaks, bosses, habitsToday);

  const dueQuests = realm.provinces.reduce((n, p) => n + p.openQuestCount, 0);
  const activePhases = realm.campaigns.reduce(
    (n, c) => n + c.phaseProgress.active,
    0,
  );

  const t = readTreasury();
  const treasury = t
    ? { holdingsCount: t.holdingsCount, markets: t.markets.length }
    : undefined;

  const overallStreak = streakFor(streaks, "overall");
  const siege = computeSiege(realm, bosses);
  const orderOfTheDay = computeOrderOfTheDay(realm, {
    nearestBoss: nearestBoss(bosses),
    overallStreak,
    nudges,
    habitsToday,
    siege,
  });

  return {
    progress,
    domains,
    overallStreak,
    nearestBoss: nearestBoss(bosses),
    nudges,
    counts: { dueQuests, activePhases },
    treasury,
    orderOfTheDay,
    siege,
  };
}
