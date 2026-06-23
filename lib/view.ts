// Maps the WorkOS RealmModel (from lib/workos/scan) into a calm, serializable
// view-model the Tracker UI renders. Runs server-side; result is passed to client.

import type { RealmModel, Campaign, DomainKey, Cadence } from "@/lib/workos/types";
import { isParked } from "@/lib/workos/parsers/project";
import { domainForName } from "@/lib/workos/domains";

const DOMAIN_ACCENT: Record<DomainKey, string> = {
  career: "#3a5a8c",
  invest: "#3a6b4f",
  health: "#c25e3a",
  learning: "#b5852e",
  personal: "#9e5640",
};

const UN = (id: string, w = 900) =>
  "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + w + "&q=70";

// All IDs verified to return 200 earlier this session (graceful gradient fallback on error).
const DOMAIN_IMG: Record<DomainKey, string> = {
  career: UN("1467232004584-a241de8bcf5d"),   // desk / workspace
  invest: UN("1517180102446-f3ece451e9d8"),   // dark laptop / dashboard
  health: UN("1476480862126-209bfaa8edc8"),   // road / running
  learning: UN("1513364776144-60967b0f800f"), // study / craft
  personal: UN("1543783207-ec64e4d95325"),    // travel / life
};

// Per-project overrides (closest verified match to each project's theme).
const PROJECT_IMG: Record<string, string> = {
  Thai_Portfolio_Tracker: UN("1517180102446-f3ece451e9d8"),    // a portfolio dashboard on screen
  Wealth_Land: UN("1518770660439-4636190af475"),               // abstract tech (gamified engine)
  LSEG_Soiree_Cocktail_Booth: UN("1455390582262-044cdead277a"),// event planning notebook
  Cosmic_Capsule_Voyage: UN("1543783207-ec64e4d95325"),        // a voyage
};

export interface ProjectCard {
  slug: string;
  name: string;
  blurb: string;
  domain: DomainKey;
  accent: string;
  img: string;
  pct: number;
  done: number;
  total: number;
  active: number;
  unit: "task" | "phase";
  isLead: boolean;
  parked: boolean;
  deadline?: string;
  daysLeft?: number;
  currentPhase?: string;
  lastSession?: string;
}

export interface NowView {
  focus?: string;
  nextActions: string[];
  waiting: string[];
  someday: string[];
}

export interface AreaView {
  slug: string;
  name: string;
  openCount: number;
}

export interface GoalView {
  label: string;
  start: number;
  current: number;
  target: number;
  unit: string;
  pct: number;
  deadline?: string;
  domain: DomainKey;
  accent: string;
}

export interface HabitView {
  label: string;
  cadence: string;
  domain: DomainKey;
  accent: string;
  doneToday: boolean;
  keystone: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function cadenceLabel(c: Cadence): string {
  switch (c.kind) {
    case "daily": return "Daily";
    case "weekly": return c.day != null ? `Weekly · ${DAYS[c.day]}` : "Weekly";
    case "xPerWeek": return `${c.times}×/week`;
    case "onDays": return c.days.map((d) => DAYS[d]).join("/");
    default: return "";
  }
}

export interface DashView {
  now: NowView;
  projects: ProjectCard[];
  areas: AreaView[];
  goals: GoalView[];
  habits: HabitView[];
  hotStale: boolean;
  deadline?: { label: string; date: string; daysLeft: number };
  counts: { inbox: number; resources: number; archive: number };
  scannedAt: string;
  vaultName: string;
}

function daysUntilISO(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return Math.ceil((t - Date.now()) / 86400000);
}

export interface Progress {
  pct: number;
  done: number;
  total: number;
  unit: "task" | "phase";
}

/**
 * One progress rule used everywhere (dashboard card AND project detail) so the
 * numbers always match: count checkbox tasks when the roadmap has them; fall
 * back to phase completion otherwise.
 */
export function progressFor(
  phaseProgress: { done: number; active: number; total: number },
  rt?: { done: number; total: number } | null,
): Progress {
  if (rt && rt.total > 0) {
    return { pct: Math.round((rt.done / rt.total) * 100), done: rt.done, total: rt.total, unit: "task" };
  }
  const { done, active, total } = phaseProgress;
  return {
    pct: total > 0 ? Math.round(((done + active * 0.5) / total) * 100) : 0,
    done,
    total,
    unit: "phase",
  };
}

export function campaignToCard(c: Campaign, rt?: { done: number; total: number } | null): ProjectCard {
  const prog = progressFor(c.phaseProgress, rt);
  const domain = domainForName(c.name);
  const parked = isParked(c.project);
  return {
    slug: c.slug,
    name: c.name,
    blurb: c.project.goal || c.project.shippedDefinition || "",
    domain,
    accent: DOMAIN_ACCENT[domain],
    img: PROJECT_IMG[c.slug] || DOMAIN_IMG[domain],
    pct: prog.pct,
    done: prog.done,
    active: c.phaseProgress.active,
    total: prog.total,
    unit: prog.unit,
    isLead: c.isLead,
    parked,
    deadline: c.project.hardDeadline,
    daysLeft: daysUntilISO(c.project.hardDeadlineDate),
    currentPhase: c.project.currentPhase,
    lastSession: c.lastSessionDate,
  };
}

export function toDashView(
  realm: RealmModel,
  tasksBySlug: Record<string, { done: number; total: number }> = {},
): DashView {
  return {
    now: {
      focus: realm.now?.focus,
      nextActions: realm.now?.nextActions ?? [],
      waiting: realm.now?.waiting ?? [],
      someday: realm.now?.someday ?? [],
    },
    projects: realm.campaigns.map((c) => campaignToCard(c, tasksBySlug[c.slug])),
    areas: realm.provinces.map((p) => ({
      slug: p.slug,
      name: p.name,
      openCount: p.openQuestCount,
    })),
    goals: realm.goals.map((g) => ({
      label: g.label,
      start: g.start,
      current: g.current,
      target: g.target,
      unit: g.unit,
      pct: Math.round(g.pct),
      deadline: g.deadlineISO,
      domain: g.domain,
      accent: DOMAIN_ACCENT[g.domain],
    })),
    habits: (() => {
      const today = realm.todayISO;
      const doneToday = new Set(realm.habitLog.filter((e) => e.date === today).map((e) => e.habitId));
      return realm.habits.map((h) => ({
        label: h.label,
        cadence: cadenceLabel(h.cadence),
        domain: h.domain,
        accent: DOMAIN_ACCENT[h.domain],
        doneToday: doneToday.has(h.id),
        keystone: /sleep/i.test(h.label),
      }));
    })(),
    hotStale: realm.hotStale,
    deadline: realm.greatSiege
      ? { label: realm.greatSiege.label, date: realm.greatSiege.date, daysLeft: realm.greatSiege.daysLeft }
      : undefined,
    counts: { inbox: realm.inboxCount, resources: realm.resourceCount, archive: realm.archiveCount },
    scannedAt: realm.scannedAtISO,
    vaultName: process.env.NEXT_PUBLIC_OBSIDIAN_VAULT || "WorkOS",
  };
}
