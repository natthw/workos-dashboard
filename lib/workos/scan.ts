import fs from "node:fs";
import path from "node:path";
import {
  PARA,
  ROOT_FILES,
  getVaultRoot,
  resolveInVault,
  toRel,
} from "./paths";
import { safeRead, statMtimeMs } from "./reader";
import type {
  Campaign,
  GreatSiege,
  Habit,
  HabitLogEntry,
  Province,
  RealmModel,
  VaultFileRef,
} from "./types";
import { parseRoadmap, phaseProgress } from "./parsers/roadmap";
import { parseTodos } from "./parsers/todos";
import { parseAreaGoals } from "./parsers/goals";
import { parseNow } from "./parsers/now";
import { parseWaiting } from "./parsers/waiting";
import { parseHabits } from "./parsers/habits";
import { parseHabitLog } from "./parsers/habitlog";
import { parseVision } from "./parsers/vision";
import {
  detectLead,
  eisenhowerRank,
  parseProject,
  priorityOf,
  projectType,
} from "./parsers/project";
import { daysSinceMs, daysUntil, extractISODate, todayISO } from "./parsers/util";

// --- small fs helpers ---------------------------------------------------------

function listDirs(absDir: string): string[] {
  try {
    return fs
      .readdirSync(absDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function prettyName(slug: string): string {
  return slug.replace(/_/g, " ").trim();
}

/** Display name from the project's CLAUDE.md `# Project: X` (or first `#`) heading. */
function projectTitle(lines: string[]): string | undefined {
  for (const ln of lines) {
    const m = ln.match(/^#\s+(?:Project\s*:\s*)?(.+?)\s*$/);
    if (m) return m[1].trim();
  }
  return undefined;
}

/** Recursively collect .md files under a dir, tagged with their top-level group. */
function walkMd(absDir: string): VaultFileRef[] {
  const out: VaultFileRef[] = [];
  const rec = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) rec(abs);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        const relToDir = path.relative(absDir, abs).replace(/\\/g, "/");
        out.push({
          name: e.name,
          relPath: toRel(abs),
          absPath: abs,
          group: relToDir.includes("/") ? relToDir.split("/")[0] : "",
        });
      }
    }
  };
  rec(absDir);
  return out;
}

function countMd(absDir: string, excludeReadme = false): number {
  return walkMd(absDir).filter(
    (f) => !(excludeReadme && f.name.toLowerCase() === "readme.md"),
  ).length;
}

function maxMtime(...mtimes: (number | undefined)[]): number {
  return mtimes.reduce<number>((m, v) => (v && v > m ? v : m), 0);
}

/**
 * Age of the oldest item sitting in `00_Inbox`, in whole days — the dimension
 * the count alone cannot carry. Six items is fine; six items where the oldest is
 * 42 days is a queue nobody is draining.
 *
 * "Age" is when the item was **captured**, not when the file last changed: a
 * note named `2026-06-30-….md` is old even if it was reopened yesterday, and
 * mtime alone resets every time Drive re-syncs the folder. So the filename's ISO
 * date wins when there is one, and mtime is the fallback for undated names.
 * `README.md` is the zone's contract rather than a backlog item, so it is
 * excluded here exactly as `inboxCount` already excludes it.
 *
 * Returns undefined for an empty inbox — nothing to be old.
 */
function oldestInboxAgeDays(): number | undefined {
  const files = walkMd(resolveInVault(PARA.inbox)).filter(
    (f) => f.name.toLowerCase() !== "readme.md",
  );
  let oldest: number | undefined;
  for (const f of files) {
    const named = extractISODate(f.name);
    let age: number;
    if (named) {
      age = Math.max(0, -daysUntil(named)); // a future-dated capture is 0d, not negative
    } else {
      const mtime = statMtimeMs(f.absPath);
      if (!mtime) continue; // unreadable — skip rather than claim an age
      age = daysSinceMs(mtime);
    }
    if (oldest == null || age > oldest) oldest = age;
  }
  return oldest;
}

// --- campaigns (projects) -----------------------------------------------------

export function listCampaignSlugs(): string[] {
  return listDirs(resolveInVault(PARA.projects));
}

export function buildCampaign(slug: string): (Campaign & { _mtime: number }) | null {
  const dir = resolveInVault(`${PARA.projects}/${slug}`);
  if (!fs.existsSync(dir)) return null;

  const claude = safeRead(path.join(dir, "CLAUDE.md"));
  const roadmapRead = safeRead(path.join(dir, "roadmap.md"));
  const project = claude
    ? parseProject(claude.lines)
    : { sections: {} as Record<string, string> };
  const roadmap = roadmapRead ? parseRoadmap(roadmapRead.lines) : undefined;

  const files = walkMd(dir);
  const sessions = files.filter((f) => f.group === "sessions");
  const lastSessionDate = sessions
    .map((f) => (f.name.match(/(\d{4}-\d{2}-\d{2})/) || [])[1])
    .filter(Boolean)
    .sort()
    .pop();

  const _mtime = maxMtime(claude?.mtimeMs, roadmapRead?.mtimeMs);

  return {
    slug,
    name: (claude ? projectTitle(claude.lines) : undefined) || prettyName(slug),
    type: projectType(project),
    isLead: detectLead(project),
    project,
    roadmap,
    sessionCount: sessions.length,
    lastSessionDate,
    phaseProgress: phaseProgress(roadmap),
    dir,
    relDir: toRel(dir),
    claudeRelPath: claude?.relPath,
    roadmapRelPath: roadmapRead?.relPath,
    roadmapAbsPath: roadmapRead?.absPath,
    files,
    _mtime,
  };
}

// --- provinces (areas) --------------------------------------------------------

export function listProvinceSlugs(): string[] {
  return listDirs(resolveInVault(PARA.areas));
}

export function buildProvince(slug: string): (Province & { _mtime: number }) | null {
  const dir = resolveInVault(`${PARA.areas}/${slug}`);
  if (!fs.existsSync(dir)) return null;

  const todosRead = safeRead(path.join(dir, "todos.md"));
  const todos = todosRead ? parseTodos(todosRead.lines) : undefined;
  const goalsRead = safeRead(path.join(dir, "goals.md"));
  const goals = goalsRead ? parseAreaGoals(goalsRead.lines) : [];
  const files = walkMd(dir);

  // Newest touch across EVERYTHING the area holds (not just todos.md) — the
  // anti-rot signal: an area whose reference hasn't moved in weeks surfaces it.
  let lastTouchedMs = maxMtime(todosRead?.mtimeMs, goalsRead?.mtimeMs);
  for (const f of files) lastTouchedMs = maxMtime(lastTouchedMs, statMtimeMs(f.absPath));

  return {
    slug,
    name: prettyName(slug),
    todos,
    todosRelPath: todosRead?.relPath,
    todosAbsPath: todosRead?.absPath,
    openQuestCount: todos?.openCount ?? 0,
    goals,
    goalsRelPath: goalsRead?.relPath,
    fileCount: files.length,
    lastTouchedMs: lastTouchedMs || undefined,
    files,
    dir,
    relDir: toRel(dir),
    _mtime: maxMtime(todosRead?.mtimeMs),
  };
}

// --- the whole realm ----------------------------------------------------------

/** A passed deadline stays in the header this long, then stops being news. */
const PAST_DEADLINE_WINDOW_DAYS = 30;

/**
 * Work-states nobody is counting down toward: finished, wrapping up, or shelved.
 * A deadline on one of these is a date in a file, not a thing to be warned about.
 */
const NOT_COUNTING_DOWN = new Set(["done", "closing-out", "parked", "someday"]);

/**
 * The nearest deadline still worth putting in the header.
 *
 * Two rules keep this honest. A project whose Eisenhower block says it is done,
 * closing out, parked, or someday is not counting down any more, so it never
 * claims the header — otherwise finished work sits there as a permanent red
 * alarm and every real deadline behind it loses its credibility. And when
 * nothing is upcoming, the
 * fallback is the MOST RECENTLY passed deadline within a 30-day window, not the
 * oldest one on record: an event from last week is news, one from last quarter
 * is history that belongs on the project card.
 */
function deriveGreatSiege(campaigns: Campaign[]): GreatSiege | undefined {
  const dated = campaigns
    .filter((c) => {
      if (!c.project.hardDeadlineDate) return false;
      return !NOT_COUNTING_DOWN.has(c.project.eisenhower?.status?.toLowerCase() ?? "");
    })
    .map((c) => ({
      name: c.name,
      date: c.project.hardDeadlineDate as string,
      days: daysUntil(c.project.hardDeadlineDate as string),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (dated.length === 0) return undefined;

  const upcoming = dated.find((d) => d.days >= 0);
  if (upcoming) return { label: upcoming.name, date: upcoming.date, daysLeft: upcoming.days };

  const justPassed = dated[dated.length - 1]; // latest date = most recently passed
  if (justPassed.days < -PAST_DEADLINE_WINDOW_DAYS) return undefined;
  return { label: justPassed.name, date: justPassed.date, daysLeft: justPassed.days };
}

export function scanRealm(): RealmModel {
  const root = getVaultRoot();

  const campaigns = listCampaignSlugs()
    .map(buildCampaign)
    .filter((c): c is Campaign & { _mtime: number } => c !== null)
    // Eisenhower placement: quadrant band first (U+I → U → I → neither), then
    // Priority (P1..P5) within the band, then nearest deadline, then name.
    .sort((a, b) => {
      const ra = eisenhowerRank(a.project);
      const rb = eisenhowerRank(b.project);
      if (ra !== rb) return ra - rb;
      const pa = priorityOf(a.project);
      const pb = priorityOf(b.project);
      if (pa !== pb) return pa - pb;
      const ad = a.project.hardDeadlineDate ?? "9999";
      const bd = b.project.hardDeadlineDate ?? "9999";
      if (ad !== bd) return ad.localeCompare(bd);
      return a.name.localeCompare(b.name);
    });

  const provinces = listProvinceSlugs()
    .map(buildProvince)
    .filter((p): p is Province & { _mtime: number } => p !== null)
    .sort((a, b) => b.openQuestCount - a.openQuestCount || a.name.localeCompare(b.name));

  const nowRead = safeRead(path.join(root, ROOT_FILES.now));
  const now = nowRead ? parseNow(nowRead.lines) : undefined;

  const waitingRead = safeRead(path.join(root, ROOT_FILES.waiting));
  const waiting = waitingRead ? parseWaiting(waitingRead.lines) : undefined;

  const inboxCount = countMd(resolveInVault(PARA.inbox), true);
  const resourceCount = countMd(resolveInVault(PARA.resources), true);
  const archiveCount = countMd(resolveInVault(PARA.archive), true);
  const inboxOldestAgeDays = oldestInboxAgeDays();

  // Habits read live from habits.md + the append-only habits-log.md.
  const habitsRead = safeRead(path.join(root, ROOT_FILES.habits));
  const habits: Habit[] = habitsRead
    ? parseHabits(habitsRead.lines, habitsRead.relPath).habits
    : [];

  const habitLogRead = safeRead(path.join(root, ROOT_FILES.habitsLog));
  const habitLog: HabitLogEntry[] = habitLogRead
    ? parseHabitLog(habitLogRead.lines)
    : [];

  // Annual goals horizon (root VISION.md) — undefined if the vault has no file.
  const visionRead = safeRead(path.join(root, ROOT_FILES.vision));
  const vision = visionRead ? parseVision(visionRead.lines, visionRead.relPath) : undefined;

  // Last-touched mtimes of the three root anchor surfaces. Nothing in LifeOS
  // reports when these go stale, so they rot silently; the dashboard is the one
  // surface a human opens daily, so it is where the signal can land. hot.md is
  // not otherwise read here — only its mtime matters.
  const rootFreshness = {
    now: nowRead?.mtimeMs,
    vision: visionRead?.mtimeMs,
    hot: statMtimeMs(path.join(root, ROOT_FILES.hot)) || undefined,
  };

  return {
    campaigns: campaigns.map(stripInternal),
    provinces: provinces.map(stripInternal),
    now,
    waiting,
    waitingRelPath: waitingRead?.relPath,
    inboxCount,
    inboxOldestAgeDays,
    resourceCount,
    archiveCount,
    rootFreshness,
    greatSiege: deriveGreatSiege(campaigns),
    scannedAtISO: new Date().toISOString(),
    habits,
    habitLog,
    vision,
    todayISO: todayISO(),
  };
}

function stripInternal<T extends { _mtime: number }>(o: T): Omit<T, "_mtime"> {
  const { _mtime, ...rest } = o;
  void _mtime;
  return rest;
}
