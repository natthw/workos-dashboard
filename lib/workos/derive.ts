import type {
  Boss,
  Cadence,
  DomainKey,
  HabitToday,
  RealmModel,
  StreakInfo,
} from "./types";
import { domainForName } from "./domains";
import { isLogged } from "./parsers/habitlog";
import {
  addDaysISO,
  dayShort,
  daysUntil,
  startOfWeekISO,
  weekdayOf,
} from "./parsers/util";

// --- streaks ------------------------------------------------------------------

/** Longest/current consecutive-day run over a set of dated signals. */
export function streakFromDates(
  dates: Iterable<string>,
  todayISO: string,
  scope: StreakInfo["scope"],
): StreakInfo {
  const set = new Set<string>();
  for (const d of dates) set.add(d);
  if (set.size === 0) {
    return { scope, current: 0, best: 0, atRisk: false };
  }

  const sorted = [...set].sort(); // ascending ISO
  const lastDate = sorted[sorted.length - 1];

  // best = longest consecutive run anywhere in history
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (addDaysISO(sorted[i - 1], 1) === sorted[i]) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  // current = run ending today or yesterday (a grace day so it isn't "broken"
  // until a full day is missed)
  let cursor: string | null = null;
  if (set.has(todayISO)) cursor = todayISO;
  else if (set.has(addDaysISO(todayISO, -1))) cursor = addDaysISO(todayISO, -1);

  let current = 0;
  while (cursor && set.has(cursor)) {
    current += 1;
    cursor = addDaysISO(cursor, -1);
  }

  return {
    scope,
    current,
    best: Math.max(best, current),
    atRisk: current > 0 && !set.has(todayISO),
    lastDate,
  };
}

/** Overall daily-activity streak + a streak per habit, all from dated signals. */
export function computeStreaks(realm: RealmModel): StreakInfo[] {
  const today = realm.todayISO;
  const out: StreakInfo[] = [];

  // overall = habit completions ∪ check-ins/log activity
  const overallDates = new Set<string>(realm.activityDates);
  for (const e of realm.habitLog) overallDates.add(e.date);
  out.push(streakFromDates(overallDates, today, "overall"));

  for (const h of realm.habits) {
    const dates = realm.habitLog
      .filter((e) => e.habitId === h.id)
      .map((e) => e.date);
    out.push(streakFromDates(dates, today, h.id));
  }
  return out;
}

export function streakFor(streaks: StreakInfo[], scope: StreakInfo["scope"]): StreakInfo {
  return (
    streaks.find((s) => s.scope === scope) ?? {
      scope,
      current: 0,
      best: 0,
      atRisk: false,
    }
  );
}

// --- habits projected onto "today" -------------------------------------------

function weekProgress(realm: RealmModel, habitId: string): number {
  const weekStart = startOfWeekISO(realm.todayISO);
  return realm.habitLog.filter(
    (e) => e.habitId === habitId && e.date >= weekStart && e.date <= realm.todayISO,
  ).length;
}

function cadenceLabel(c: Cadence): string {
  switch (c.kind) {
    case "daily":
      return "daily";
    case "onDays":
      return c.days.map(dayShort).join("/") || "—";
    case "weekly":
      return c.day != null ? `weekly · ${dayShort(c.day)}` : "weekly";
    case "xPerWeek":
      return `${c.times}×/wk`;
  }
}

function isDueToday(c: Cadence, weekday: number, weekDone: number): boolean {
  switch (c.kind) {
    case "daily":
      return true;
    case "onDays":
      return c.days.includes(weekday);
    case "weekly":
      return c.day != null ? weekday === c.day : weekDone < 1;
    case "xPerWeek":
      return weekDone < c.times;
  }
}

/** Project the declared habits onto today, with done/due/week state. */
export function computeHabitsToday(realm: RealmModel): HabitToday[] {
  const weekday = weekdayOf(realm.todayISO);
  return realm.habits.map((h) => {
    const doneToday = isLogged(realm.habitLog, h.id, realm.todayISO);
    const weekDone = weekProgress(realm, h.id);
    const need =
      h.cadence.kind === "xPerWeek"
        ? h.cadence.times
        : h.cadence.kind === "weekly" && h.cadence.day == null
          ? 1
          : undefined;
    return {
      ...h,
      doneToday,
      dueToday: isDueToday(h.cadence, weekday, weekDone),
      logRelPath: realm.habitsLogRelPath,
      cadenceLabel: cadenceLabel(h.cadence),
      weekProgress: need != null ? { done: weekDone, need } : undefined,
    };
  });
}

// --- bosses -------------------------------------------------------------------

function bossState(
  defeated: boolean,
  daysLeft: number | undefined,
  pct: number | undefined,
): Boss["state"] {
  if (defeated) return "defeated";
  if (daysLeft != null && daysLeft < 0) return "breached";
  if ((daysLeft != null && daysLeft <= 14) || (pct != null && pct >= 90)) {
    return "looming";
  }
  return "active";
}

/** Generalize the single Great Siege to ALL measurable goals + dated deadlines. */
export function computeBosses(realm: RealmModel): Boss[] {
  const bosses: Boss[] = [];

  // 1. Goal bosses (measurable targets)
  for (const g of realm.goals) {
    const daysLeft = g.deadlineISO ? daysUntil(g.deadlineISO) : undefined;
    const defeated = g.pct >= 100;
    bosses.push({
      id: `goal:${g.domain}:${g.id}`,
      title: g.label,
      kind: "goal",
      domain: g.domain,
      progressPct: g.pct,
      deadlineISO: g.deadlineISO,
      daysLeft,
      state: bossState(defeated, daysLeft, g.pct),
      detail: `${trimNum(g.current)} / ${trimNum(g.target)} ${g.unit}`.trim(),
    });
  }

  // 2. Campaign deadline bosses (combined progress = phases done)
  for (const c of realm.campaigns) {
    const date = c.project.hardDeadlineDate;
    if (!date) continue;
    const total = c.phaseProgress.total;
    const pct = total > 0 ? Math.round((c.phaseProgress.done / total) * 100) : undefined;
    const daysLeft = daysUntil(date);
    const defeated = total > 0 && c.phaseProgress.done === total;
    bosses.push({
      id: `deadline:${c.slug}`,
      title: c.name,
      kind: "combined",
      domain: domainForName(c.name),
      progressPct: pct,
      deadlineISO: date,
      daysLeft,
      state: bossState(defeated, daysLeft, pct),
      href: `/campaign/${encodeURIComponent(c.slug)}`,
      detail:
        total > 0
          ? `phase ${c.phaseProgress.done}/${total} · ship ${date}`
          : `ship ${date}`,
    });
  }

  return sortBosses(bosses);
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const STATE_RANK: Record<Boss["state"], number> = {
  breached: 0,
  looming: 1,
  active: 2,
  defeated: 3,
};

export function sortBosses(bosses: Boss[]): Boss[] {
  return [...bosses].sort((a, b) => {
    if (STATE_RANK[a.state] !== STATE_RANK[b.state]) {
      return STATE_RANK[a.state] - STATE_RANK[b.state];
    }
    const ad = a.daysLeft ?? 99_999;
    const bd = b.daysLeft ?? 99_999;
    if (ad !== bd) return ad - bd;
    return (b.progressPct ?? 0) - (a.progressPct ?? 0);
  });
}

/** Nearest still-fightable boss with a deadline (drives the HUD countdown). */
export function nearestBoss(bosses: Boss[]): Boss | undefined {
  return bosses
    .filter((b) => b.state !== "defeated" && b.daysLeft != null && b.daysLeft >= 0)
    .sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number))[0];
}

// --- nudges (encouragement / warnings, derived purely from state) -------------

export type NudgeKind = "praise" | "atRisk" | "inactivity" | "deadline" | "hotStale";
export interface Nudge {
  id: string;
  kind: NudgeKind;
  text: string;
  tone: "gold" | "amber" | "danger";
  priority: number; // higher = more urgent
  href?: string;
  domain?: DomainKey;
}

const STREAK_LANDMARKS = [3, 7, 14, 30, 50, 100];

export function computeNudges(
  realm: RealmModel,
  streaks: StreakInfo[],
  bosses: Boss[],
  habitsToday: HabitToday[],
): Nudge[] {
  const out: Nudge[] = [];
  const overall = streakFor(streaks, "overall");

  if (overall.current > 0 && STREAK_LANDMARKS.includes(overall.current)) {
    out.push({
      id: "praise-overall",
      kind: "praise",
      text: `${overall.current}-day chain — the realm thrives. Keep it lit.`,
      tone: "gold",
      priority: 70,
    });
  }

  if (overall.current >= 3 && overall.atRisk) {
    out.push({
      id: "atrisk-overall",
      kind: "atRisk",
      text: `Keep your ${overall.current}-day chain alive — log one thing today.`,
      tone: "amber",
      priority: 80,
    });
  }

  // Inactivity: a habit due today but not done, with a known last completion.
  for (const h of habitsToday) {
    if (!h.dueToday || h.doneToday) continue;
    const last = realm.habitLog
      .filter((e) => e.habitId === h.id)
      .map((e) => e.date)
      .sort()
      .pop();
    const gap = last ? daysUntil(last) * -1 : undefined; // days since last
    if (gap != null && gap >= 3) {
      out.push({
        id: `inactive-${h.id}`,
        kind: "inactivity",
        text: `No ${h.label} in ${gap} days — it's due today.`,
        tone: "amber",
        priority: 50,
        domain: h.domain,
        href: `/zone/${h.domain}`,
      });
    }
  }

  // Deadlines within 3 days.
  for (const b of bosses) {
    if (b.state === "defeated") continue;
    if (b.daysLeft != null && b.daysLeft >= 0 && b.daysLeft <= 3) {
      out.push({
        id: `deadline-${b.id}`,
        kind: "deadline",
        text: `${b.title} — ${b.daysLeft === 0 ? "due today" : `${b.daysLeft} day${b.daysLeft === 1 ? "" : "s"} left`}.`,
        tone: "danger",
        priority: 90,
        domain: b.domain,
        href: b.href ?? "/bosses",
      });
    } else if (b.state === "breached" && b.daysLeft != null) {
      out.push({
        id: `breached-${b.id}`,
        kind: "deadline",
        text: `${b.title} — BREACHED, overdue ${Math.abs(b.daysLeft)} days.`,
        tone: "danger",
        priority: 95,
        domain: b.domain,
        href: b.href ?? "/bosses",
      });
    }
  }

  // (hot-stale keeps its own dedicated HUD row — not duplicated as a nudge.)

  return out.sort((a, b) => b.priority - a.priority);
}
