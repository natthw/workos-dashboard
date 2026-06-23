import fs from "node:fs";
import path from "node:path";
import {
  DIRS,
  PARA,
  ROOT_FILES,
  getVaultRoot,
  resolveInVault,
  toRel,
} from "./paths";
import { safeRead } from "./reader";
import type {
  Bounty,
  Campaign,
  Goal,
  GreatSiege,
  Habit,
  HabitLogEntry,
  Province,
  RealmModel,
  VaultFileRef,
} from "./types";
import { parseRoadmap, phaseProgress } from "./parsers/roadmap";
import { parseTodos } from "./parsers/todos";
import { parseLog } from "./parsers/log";
import { parseNow } from "./parsers/now";
import { parseHot } from "./parsers/hot";
import { parseHabits } from "./parsers/habits";
import { parseGoals } from "./parsers/goals";
import { parseHabitLog } from "./parsers/habitlog";
import { detectLead, isParked, parseProject, projectType } from "./parsers/project";
import { daysUntil, slugify, todayISO } from "./parsers/util";
import { domainForName } from "./domains";

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

/** Dated filenames (YYYY-MM-DD.md) in a directory, e.g. Daily_Notes. */
function listDatedNotes(absDir: string): string[] {
  try {
    return fs
      .readdirSync(absDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name.match(/^(\d{4}-\d{2}-\d{2})\.md$/i)?.[1])
      .filter((d): d is string => Boolean(d))
      .sort();
  } catch {
    return [];
  }
}

// --- campaigns (projects) -----------------------------------------------------

export function listCampaignSlugs(): string[] {
  return listDirs(resolveInVault(PARA.projectsActive));
}

export function buildCampaign(slug: string): (Campaign & { _mtime: number }) | null {
  const dir = resolveInVault(`${PARA.projectsActive}/${slug}`);
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
  const files = walkMd(dir);

  return {
    slug,
    name: prettyName(slug),
    todos,
    todosRelPath: todosRead?.relPath,
    todosAbsPath: todosRead?.absPath,
    openQuestCount: todos?.openCount ?? 0,
    files,
    dir,
    relDir: toRel(dir),
    _mtime: maxMtime(todosRead?.mtimeMs),
  };
}

// --- the whole realm ----------------------------------------------------------

function deriveGreatSiege(campaigns: Campaign[]): GreatSiege | undefined {
  const dated = campaigns
    .filter((c) => c.project.hardDeadlineDate)
    .map((c) => ({
      name: c.name,
      date: c.project.hardDeadlineDate as string,
      days: daysUntil(c.project.hardDeadlineDate as string),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (dated.length === 0) return undefined;

  const next = dated.find((d) => d.days >= 0) ?? dated[0];
  return {
    label: next.name,
    date: next.date,
    daysLeft: next.days,
    weeksLeft: Math.round(next.days / 7),
  };
}

export function scanRealm(): RealmModel {
  const root = getVaultRoot();

  const campaigns = listCampaignSlugs()
    .map(buildCampaign)
    .filter((c): c is Campaign & { _mtime: number } => c !== null)
    // priority band (lead → active → parked), then nearest deadline, then name
    .sort((a, b) => {
      const band = (c: Campaign) =>
        c.isLead ? 0 : isParked(c.project) ? 2 : 1;
      if (band(a) !== band(b)) return band(a) - band(b);
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
  const logRead = safeRead(path.join(root, ROOT_FILES.log));
  const hotRead = safeRead(path.join(root, ROOT_FILES.hot));

  const now = nowRead ? parseNow(nowRead.lines) : undefined;
  const allLog = logRead ? parseLog(logRead.lines, 9999) : [];
  const recentLog = allLog.slice(0, 8);
  const hot = hotRead ? parseHot(hotRead.lines, hotRead.mtimeMs) : undefined;

  // hot.md is "stale" if any tracked content file is newer than it.
  const newestContent = maxMtime(
    nowRead?.mtimeMs,
    logRead?.mtimeMs,
    ...campaigns.map((c) => c._mtime),
    ...provinces.map((p) => p._mtime),
  );
  const hotStale = hot ? newestContent > hot.mtimeMs + 1000 : false;

  const inboxCount = countMd(resolveInVault(PARA.inbox), true);
  const resourceCount = countMd(resolveInVault(PARA.resources), true);
  const archiveCount = countMd(resolveInVault(PARA.archive), true);

  // --- v2 engagement layer (habits, goals, bounties, streak signals) ---------
  const habitsRead = safeRead(path.join(root, ROOT_FILES.habits));
  const habits: Habit[] = habitsRead
    ? parseHabits(habitsRead.lines, habitsRead.relPath).habits
    : [];

  const habitLogRead = safeRead(path.join(root, ROOT_FILES.habitsLog));
  const habitLog: HabitLogEntry[] = habitLogRead
    ? parseHabitLog(habitLogRead.lines)
    : [];

  // Per-area goals.md + standing triggers (bounties) from province todos.
  const goals: Goal[] = [];
  const bounties: Bounty[] = [];
  for (const p of provinces) {
    const dom = domainForName(p.name);
    const goalsRead = safeRead(path.join(p.dir, "goals.md"));
    if (goalsRead) {
      goals.push(...parseGoals(goalsRead.lines, goalsRead.relPath, dom).goals);
    }
    for (const section of p.todos?.sections ?? []) {
      if (!/trigger|bounty/i.test(section.heading)) continue;
      for (const note of section.notes) {
        bounties.push({
          id: slugify(`${p.slug}-${note.text}`),
          condition: note.text,
          domain: dom,
          sourceRelPath: p.todosRelPath ?? p.relDir,
        });
      }
    }
  }

  const dailyDates = listDatedNotes(resolveInVault(DIRS.dailyNotes));
  const today = todayISO();
  const dailyNoteToday = dailyDates.includes(today);
  const activityDates = [
    ...new Set([...allLog.map((e) => e.date), ...dailyDates]),
  ];

  return {
    campaigns: campaigns.map(stripInternal),
    provinces: provinces.map(stripInternal),
    now,
    hot,
    recentLog,
    logEntryCount: allLog.length,
    inboxCount,
    resourceCount,
    archiveCount,
    greatSiege: deriveGreatSiege(campaigns),
    hotStale,
    scannedAtISO: new Date().toISOString(),
    vaultRoot: root,
    habits,
    habitLog,
    goals,
    bounties,
    habitsLogRelPath: ROOT_FILES.habitsLog,
    todayISO: today,
    dailyNoteToday,
    activityDates,
  };
}

function stripInternal<T extends { _mtime: number }>(o: T): Omit<T, "_mtime"> {
  const { _mtime, ...rest } = o;
  void _mtime;
  return rest;
}
