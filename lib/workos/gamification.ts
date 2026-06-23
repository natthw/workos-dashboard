import type { DomainKey, DomainProgress, RealmModel } from "./types";
import { daysUntil } from "./parsers/util";
import { DOMAIN_META, DOMAIN_ORDER, domainForName } from "./domains";
import { computeStreaks, streakFor } from "./derive";

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide icon name, resolved in the UI
  earned: boolean;
  domain?: DomainKey; // optional front this honor belongs to
}

export interface RealmProgress {
  xp: number;
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  pctToNext: number; // 0..100
  momentum: number; // 0..100
  achievements: Achievement[];
  earnedCount: number;
}

// The cursus honorum — Roman ladder of offices (docs/imperium/02 §6).
// Display-only; levelTitle() signature unchanged.
export const LEVEL_TITLES = [
  "Colonus", "Civis", "Decurio", "Quaestor", "Aedilis",
  "Praetor", "Legatus", "Consul", "Princeps", "Augustus",
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

/**
 * Total XP awarded by all logged habit completions (FR1.3). Derived live from
 * the append-only habits-log.md — no separate save file.
 */
export function habitXpTotal(realm: RealmModel): number {
  const xpById = new Map(realm.habits.map((h) => [h.id, h.xp]));
  return realm.habitLog.reduce((n, e) => n + (xpById.get(e.habitId) ?? 0), 0);
}

/** XP is derived purely from durable vault state — no separate save file. */
export function computeXp(realm: RealmModel): number {
  const phasesDone = realm.campaigns.reduce((n, c) => n + c.phaseProgress.done, 0);
  const phasesActive = realm.campaigns.reduce((n, c) => n + c.phaseProgress.active, 0);
  const questsDone = realm.provinces.reduce(
    (n, p) => n + (p.todos?.doneCount ?? 0),
    0,
  );
  const settledProvinces = realm.provinces.filter((p) => p.files.length > 0).length;

  return (
    phasesDone * 60 +
    phasesActive * 15 +
    questsDone * 12 +
    realm.logEntryCount * 8 +
    realm.campaigns.length * 10 +
    settledProvinces * 5 +
    habitXpTotal(realm)
  );
}

export function levelFromXp(xp: number): {
  level: number;
  into: number;
  need: number;
} {
  let level = 1;
  let need = 200;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level += 1;
    need = Math.round(need * 1.35);
  }
  return { level, into: xp - acc, need };
}

function momentum(realm: RealmModel): number {
  const recentLogs = realm.recentLog.filter((e) => daysUntil(e.date) >= -7).length;
  const activePhases = realm.campaigns.reduce((n, c) => n + c.phaseProgress.active, 0);
  const hasLead = realm.campaigns.some((c) => c.isLead);
  const raw =
    recentLogs * 16 + activePhases * 12 + (hasLead ? 20 : 0) - (realm.hotStale ? 8 : 0);
  return Math.max(0, Math.min(100, raw));
}

export function computeAchievements(realm: RealmModel): Achievement[] {
  const phasesDone = realm.campaigns.reduce((n, c) => n + c.phaseProgress.done, 0);
  const questsDone = realm.provinces.reduce(
    (n, p) => n + (p.todos?.doneCount ?? 0),
    0,
  );
  const overdue = realm.campaigns.some((c) =>
    (c.roadmap?.phases ?? []).some((p) => p.overdue),
  );
  const maxPhaseDone = Math.max(
    0,
    ...realm.campaigns.map((c) => c.phaseProgress.done),
  );

  // Derived engagement signals (all from append-only logs / vault state).
  const overall = streakFor(computeStreaks(realm), "overall");
  const goalHit = realm.goals.some((g) => g.pct >= 100);
  const healthLogged = realm.habitLog.some((e) =>
    realm.habits.some((h) => h.id === e.habitId && h.domain === "health"),
  );
  const learnLogged = realm.habitLog.some((e) =>
    realm.habits.some((h) => h.id === e.habitId && h.domain === "learning"),
  );

  // Honores — display names Romanized (docs/imperium/02 §5); `id`s unchanged.
  return [
    { id: "first_stone", name: "First Stone Laid", desc: "Complete a March (roadmap phase)", icon: "Castle", earned: phasesDone >= 1, domain: "career" },
    { id: "three_banners", name: "Three Standards", desc: "Muster 3 campaigns at once", icon: "Flag", earned: realm.campaigns.length >= 3, domain: "career" },
    { id: "governor", name: "Governor of Four Provinces", desc: "Settle 4 Provinces", icon: "Map", earned: realm.provinces.filter((p) => p.files.length > 0).length >= 4 },
    { id: "quartermaster", name: "Quartermaster", desc: "Fulfil an Order", icon: "ListChecks", earned: questsDone >= 1 },
    { id: "siege_engineer", name: "Siege Engineer", desc: "Drive a Campaign two Marches deep", icon: "Swords", earned: maxPhaseDone >= 2, domain: "career" },
    { id: "chronicler", name: "Annalist", desc: "Record 8 entries in the Annals", icon: "ScrollText", earned: realm.logEntryCount >= 8 },
    { id: "peace", name: "Pax Romana", desc: "Nothing blocked on the War Table", icon: "Shield", earned: (realm.now?.waiting.length ?? 1) === 0 },
    { id: "unbreached", name: "Walls Unbreached", desc: "No overdue March targets", icon: "Crown", earned: !overdue },
    // v2 — engagement & domains
    { id: "first_drill", name: "First Drill", desc: "Log a Drill", icon: "Flame", earned: realm.habitLog.length >= 1 },
    { id: "disciplined", name: "Disciplined", desc: "Hold a 7-day Vigil", icon: "CalendarCheck", earned: overall.current >= 7 || overall.best >= 7 },
    { id: "unbroken", name: "Unbroken Vigil", desc: "Reach a 30-day Vigil", icon: "Infinity", earned: overall.best >= 30 },
    { id: "goal_setter", name: "Goal Setter", desc: "Declare a measurable goal", icon: "Target", earned: realm.goals.length >= 1 },
    { id: "vanquisher", name: "Adversary Vanquisher", desc: "Vanquish an Adversary (100%)", icon: "Skull", earned: goalHit },
    { id: "iron_body", name: "Iron Body", desc: "Train in the Castra", icon: "Dumbbell", earned: healthLogged, domain: "health" },
    { id: "scholar", name: "Scholar", desc: "Study in the Athenaeum", icon: "BookOpen", earned: learnLogged, domain: "learning" },
  ];
}

// --- per-domain progression (FR3.1/3.2) --------------------------------------

interface DomainXp {
  xp: number;
  activePhases: number;
}

/**
 * Split global XP across the five domains. INVARIANT: the sum of domain XP
 * exactly equals computeXp(realm) — the global headline never changes.
 * The only non-attributable component (the global chronicle, logEntryCount·8)
 * is assigned to "career", the realm's work front.
 */
function domainXpMap(realm: RealmModel): Record<DomainKey, DomainXp> {
  const m: Record<DomainKey, DomainXp> = {
    career: { xp: 0, activePhases: 0 },
    invest: { xp: 0, activePhases: 0 },
    health: { xp: 0, activePhases: 0 },
    learning: { xp: 0, activePhases: 0 },
    personal: { xp: 0, activePhases: 0 },
  };

  for (const c of realm.campaigns) {
    const d = domainForName(c.name);
    m[d].xp += c.phaseProgress.done * 60 + c.phaseProgress.active * 15 + 10;
    m[d].activePhases += c.phaseProgress.active;
  }
  for (const p of realm.provinces) {
    const d = domainForName(p.name);
    const settled = p.files.length > 0 ? 5 : 0;
    m[d].xp += (p.todos?.doneCount ?? 0) * 12 + settled;
  }
  // habit completions → each habit's own domain (FR3.1)
  const xpById = new Map(realm.habits.map((h) => [h.id, { xp: h.xp, domain: h.domain }]));
  for (const e of realm.habitLog) {
    const h = xpById.get(e.habitId);
    if (h) m[h.domain].xp += h.xp;
  }
  // global chronicle XP → career (keeps the reconciliation exact)
  m.career.xp += realm.logEntryCount * 8;

  return m;
}

function domainMomentum(realm: RealmModel, domain: DomainKey, activePhases: number): number {
  const weekAgo = -7;
  const recentCompletions = realm.habitLog.filter((e) => {
    const h = realm.habits.find((x) => x.id === e.habitId);
    return h?.domain === domain && daysUntil(e.date) >= weekAgo;
  }).length;
  return Math.max(0, Math.min(100, activePhases * 16 + recentCompletions * 7));
}

export function computeDomainProgress(realm: RealmModel): DomainProgress[] {
  const map = domainXpMap(realm);
  return DOMAIN_ORDER.map((key) => {
    const { xp, activePhases } = map[key];
    const { level, into, need } = levelFromXp(xp);
    const meta = DOMAIN_META[key];
    return {
      domain: key,
      title: meta.title,
      zoneTitle2: meta.zoneTitle2,
      xp,
      level,
      levelTitle: levelTitle(level),
      pctToNext: Math.round((into / need) * 100),
      xpIntoLevel: into,
      xpForNextLevel: need,
      momentum: domainMomentum(realm, key, activePhases),
    };
  });
}

export function computeProgress(realm: RealmModel): RealmProgress {
  const xp = computeXp(realm);
  const { level, into, need } = levelFromXp(xp);
  const achievements = computeAchievements(realm);
  return {
    xp,
    level,
    levelTitle: levelTitle(level),
    xpIntoLevel: into,
    xpForNextLevel: need,
    pctToNext: Math.round((into / need) * 100),
    momentum: momentum(realm),
    achievements,
    earnedCount: achievements.filter((a) => a.earned).length,
  };
}
