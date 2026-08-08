// Maps the WorkOS RealmModel (from lib/workos/scan) into a calm, serializable
// view-model the WorkOS Dashboard UI renders. Runs server-side; passed to client.

import type { RealmModel, Campaign, DomainKey, Cadence, StatusKey, VisionDoc } from "@/lib/workos/types";
import { isParked } from "@/lib/workos/parsers/project";
import { daysUntil } from "@/lib/workos/parsers/util";
import { domainForName, DOMAIN_ORDER } from "@/lib/workos/domains";

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
  Portfolio_Management_System: UN("1517180102446-f3ece451e9d8"), // a portfolio dashboard on screen
  MoonPort_City: UN("1518770660439-4636190af475"),             // abstract tech (gamified engine)
  LSEG_Soiree_Cocktail_Booth: UN("1509669803555-fd5edd8d5a41"),// bartender shaking a cocktail shaker
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
  priority?: number; // P1..P5 from the Eisenhower block (undefined if absent)
  status?: string; // work-state: active | parked | someday | closing-out | done
  deadline?: string;
  daysLeft?: number;
  /** Rendered deadline copy + tone. Computed once here so every surface agrees. */
  due?: DeadlineLabel;
  currentPhase?: string;
  lastSession?: string;
}

export interface NowView {
  focus?: string;
  nextActions: string[];
  waiting: string[];
  someday: string[];
}

/** One numeric metric from an area's goals.md, ready to render as a mini bar. */
export interface AreaGoalView {
  label: string;
  current: number;
  target: number;
  unit?: string;
  pct: number;
  dateText?: string;
}

export interface AreaView {
  slug: string;
  name: string;
  openCount: number;
  goals: AreaGoalView[];
  fileCount: number;
  /** Whole days since ANY .md in the area changed — the anti-rot signal. */
  lastTouchedDays?: number;
  todosRelPath?: string;
}

export interface HabitView {
  label: string;
  cadence: string;
  domain: DomainKey;
  accent: string;
  doneToday: boolean;
  keystone: boolean;
  detail: string[];
  sourceRelPath: string;
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

/** One rendered goal in the Vision band: a metric bar or a milestone chip. */
export interface VisionGoalView {
  label: string;
  domain: DomainKey;
  accent: string;
  kind: "metric" | "milestone";
  pct?: number; // metric / linked: bar fill
  valueLabel?: string; // "12 / 100 hrs" or "60%"
  statusKey?: StatusKey; // milestone: drives the chip
  statusLabel?: string; // "active" / "not started" / "done"
  linkSlug?: string; // resolved campaign slug (progress derived from it)
  source?: "derived" | "manual"; // where the number comes from (note line)
  date?: string; // ISO target date
}

export interface VisionDomainGroup {
  domain: DomainKey;
  accent: string;
  goals: VisionGoalView[]; // empty → the domain is dormant (no goal this year)
  aggPct: number; // domain momentum: mean goal progress (milestone done/active/todo = 100/50/0)
  goalCount: number;
}

export interface VisionView {
  year?: number;
  tagline?: string;
  domains: VisionDomainGroup[]; // all five in DOMAIN_ORDER, dormant ones included
  activeDomainCount: number;
  totalDomainCount: number;
}

export interface DashView {
  now: NowView;
  projects: ProjectCard[];
  areas: AreaView[];
  habits: HabitView[];
  vision?: VisionView;
  deadline?: { label: string; date: string; daysLeft: number; due: DeadlineLabel };
  counts: { inbox: number; resources: number; archive: number };
  scannedAt: string;
  vaultName: string;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusLabelOf(k: StatusKey): string {
  switch (k) {
    case "done": return "done";
    case "active": return "active";
    case "todo": return "not started";
    default: return "planned";
  }
}

/** A goal's progress as a single number (milestone done/active/todo → 100/50/0). */
function goalPct(g: VisionGoalView): number {
  if (g.kind === "milestone") {
    return g.statusKey === "done" ? 100 : g.statusKey === "active" ? 50 : 0;
  }
  return g.pct ?? 0;
}

/** Normalize a slug/name for tolerant [[link]] → campaign matching. */
function slugKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Map VISION.md → a band grouped by the five domains. A goal that links a project
 * ([[slug]]) takes that project's roadmap % as its progress (always honest, never
 * typed); a numeric metric computes (current-start)/(target-start); a milestone
 * renders a status chip. Every domain is present so dormant ones (no goal) show.
 */
export function toVisionView(
  vision: VisionDoc | undefined,
  campaigns: Campaign[],
  tasksBySlug: Record<string, { done: number; total: number }>,
): VisionView | undefined {
  if (!vision) return undefined;

  const bySlug = new Map<string, Campaign>();
  for (const c of campaigns) bySlug.set(slugKey(c.slug), c);

  const groups: VisionDomainGroup[] = DOMAIN_ORDER.map((domain) => ({
    domain,
    accent: DOMAIN_ACCENT[domain],
    goals: [],
    aggPct: 0,
    goalCount: 0,
  }));
  const byDomain = new Map(groups.map((g) => [g.domain, g]));

  for (const g of vision.goals) {
    const accent = DOMAIN_ACCENT[g.domain];
    const camp = g.projectSlug ? bySlug.get(slugKey(g.projectSlug)) : undefined;
    let gv: VisionGoalView;

    if (camp) {
      const prog = progressFor(camp.phaseProgress, tasksBySlug[camp.slug]);
      gv = {
        label: g.label, domain: g.domain, accent, kind: "metric",
        pct: prog.pct, valueLabel: `${prog.pct}%`,
        linkSlug: camp.slug, source: "derived", date: g.date,
      };
    } else if (g.kind === "metric" && g.target != null) {
      const start = g.start ?? 0;
      const current = g.current ?? start;
      const denom = g.target - start;
      const unit = g.unit ? ` ${g.unit}` : "";
      gv = {
        label: g.label, domain: g.domain, accent, kind: "metric",
        pct: denom !== 0 ? clampPct(((current - start) / denom) * 100) : 0,
        valueLabel: `${current} / ${g.target}${unit}`,
        source: "manual", date: g.date,
      };
    } else {
      const sk = g.statusKey ?? "todo";
      gv = {
        label: g.label, domain: g.domain, accent, kind: "milestone",
        statusKey: sk, statusLabel: statusLabelOf(sk), date: g.date,
      };
    }
    byDomain.get(g.domain)?.goals.push(gv);
  }

  for (const grp of groups) {
    grp.goalCount = grp.goals.length;
    grp.aggPct = grp.goals.length
      ? Math.round(grp.goals.reduce((a, gv) => a + goalPct(gv), 0) / grp.goals.length)
      : 0;
  }

  return {
    year: vision.year,
    tagline: vision.tagline,
    domains: groups,
    activeDomainCount: groups.filter((g) => g.goals.length > 0).length,
    totalDomainCount: groups.length,
  };
}

function daysUntilISO(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  // Delegate to the same calendar-day math the header's nearest-deadline uses
  // (local-midnight to local-midnight), so a deadline reads identically on the
  // card, the detail page, and the header pill — no off-by-one between surfaces.
  return daysUntil(iso);
}

// --- deadlines ---------------------------------------------------------------

/**
 * How loudly a deadline should read.
 *  soon  — act on this now (accent)
 *  warn  — genuinely late, and recently enough to still be actionable (red)
 *  quiet — a date worth knowing, carrying no pressure (neutral ink)
 */
export type DeadlineTone = "soon" | "warn" | "quiet";

export interface DeadlineLabel {
  /** Terse form for the chip, e.g. `due in 6d`. */
  text: string;
  /** Spoken form, e.g. `due in 6 days` — "6d" reads badly aloud. */
  srText: string;
  tone: DeadlineTone;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-06-26` → `26 Jun` (plus the year when it isn't the current one). */
function shortDate(iso: string, today = new Date()): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** A project whose own Eisenhower block says the work is wrapping up or over. */
function isClosed(status?: string): boolean {
  const s = status?.toLowerCase();
  return s === "done" || s === "closing-out";
}

/** Past this many days late, an overdue count stops informing and starts shaming. */
export const OVERDUE_GRACE_DAYS = 14;

/**
 * One deadline vocabulary for every surface — the header pill, the project card,
 * and the detail page all render this, so they can never disagree.
 *
 * The rule that matters: a countdown only means something while someone is still
 * counting. Once a project's status says the work is done or closing out, or the
 * date fell far enough behind that the number is no longer actionable, the label
 * drops to the one fact that stays true — when it was due. An alarm that can only
 * grow ("41d overdue", then 300d) stops being read, and takes the credibility of
 * every real deadline with it.
 */
export function deadlineLabel(
  daysLeft: number,
  opts: { isoDate?: string; status?: string } = {},
): DeadlineLabel {
  const { isoDate, status } = opts;
  const on = isoDate ? shortDate(isoDate) : undefined;
  const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

  // The vault says this project is finished or closing out — the date is history,
  // not a target. State it and stop.
  if (isClosed(status)) {
    const t = on ? (daysLeft < 0 ? `was due ${on}` : `due ${on}`) : daysLeft < 0 ? "past its date" : "still ahead";
    return { text: t, srText: t, tone: "quiet" };
  }

  if (daysLeft < 0) {
    const late = Math.abs(daysLeft);
    if (late <= OVERDUE_GRACE_DAYS) {
      return { text: `${late}d overdue`, srText: `${days(late)} overdue`, tone: "warn" };
    }
    // Long past and still open. Show when, not how far behind — the size of the
    // number was never the useful part.
    const t = on ? `was due ${on}` : "past its date";
    return { text: t, srText: t, tone: "quiet" };
  }

  if (daysLeft === 0) return { text: "due today", srText: "due today", tone: "soon" };
  if (daysLeft === 1) return { text: "due tomorrow", srText: "due tomorrow", tone: "soon" };
  if (daysLeft <= 7) return { text: `due in ${daysLeft}d`, srText: `due in ${days(daysLeft)}`, tone: "soon" };
  if (daysLeft <= 30) return { text: `due in ${daysLeft}d`, srText: `due in ${days(daysLeft)}`, tone: "quiet" };
  // Beyond a month, a countdown is noise — a date is something you can plan around.
  const t = on ? `due ${on}` : `due in ${daysLeft}d`;
  return { text: t, srText: on ? `due ${on}` : `due in ${days(daysLeft)}`, tone: "quiet" };
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
  const daysLeft = daysUntilISO(c.project.hardDeadlineDate);
  const status = c.project.eisenhower?.status;
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
    priority: c.project.eisenhower?.priority,
    status,
    deadline: c.project.hardDeadline,
    daysLeft,
    due:
      daysLeft != null
        ? deadlineLabel(daysLeft, { isoDate: c.project.hardDeadlineDate, status })
        : undefined,
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
    vision: toVisionView(realm.vision, realm.campaigns, tasksBySlug),
    areas: realm.provinces.map((p) => ({
      slug: p.slug,
      name: p.name,
      openCount: p.openQuestCount,
      goals: p.goals.map((g) => {
        const denom = g.target - g.start;
        return {
          label: g.label,
          current: g.current,
          target: g.target,
          unit: g.unit,
          pct: denom !== 0 ? clampPct(((g.current - g.start) / denom) * 100) : 0,
          dateText: g.dateText,
        };
      }),
      fileCount: p.fileCount,
      lastTouchedDays:
        p.lastTouchedMs != null
          ? Math.max(0, Math.floor((Date.now() - p.lastTouchedMs) / 86400000))
          : undefined,
      todosRelPath: p.todosRelPath,
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
        detail: h.detail ?? [],
        sourceRelPath: h.sourceRelPath,
      }));
    })(),
    deadline: realm.greatSiege
      ? {
          label: realm.greatSiege.label,
          date: realm.greatSiege.date,
          daysLeft: realm.greatSiege.daysLeft,
          // scan.ts already drops done/closing-out projects, so this is always a
          // deadline someone is still counting toward.
          due: deadlineLabel(realm.greatSiege.daysLeft, { isoDate: realm.greatSiege.date }),
        }
      : undefined,
    counts: { inbox: realm.inboxCount, resources: realm.resourceCount, archive: realm.archiveCount },
    scannedAt: realm.scannedAtISO,
    vaultName: process.env.NEXT_PUBLIC_OBSIDIAN_VAULT || "WorkOS",
  };
}
