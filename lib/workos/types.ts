// Shared types for the WorkOS data layer.

export type StatusKey = "done" | "active" | "todo" | "unknown";

export interface RoadmapPhase {
  name: string; // full heading e.g. "Phase 0 — Planning + NAV spike"
  shortName: string; // "Phase 0"
  goal?: string;
  target?: string; // raw target string
  targetDate?: string; // ISO if parseable
  overdue?: boolean;
  status: string; // raw status text
  statusKey: StatusKey;
  lineNumber: number; // 0-based index of the "## Phase…" heading line
  statusLineNumber?: number; // 0-based index of the "Status:" line (for write-back)
}

export interface Roadmap {
  title?: string;
  phases: RoadmapPhase[];
}

export interface TodoItem {
  text: string; // text after the checkbox
  raw: string; // the full raw line
  checked: boolean;
  lineNumber: number; // 0-based index in the raw file (for write-back)
  addedDate?: string;
  section: string;
}

export interface TodoNote {
  text: string;
  section: string;
}

export interface TodoSection {
  heading: string;
  items: TodoItem[];
  notes: TodoNote[];
}

export interface TodosDoc {
  sections: TodoSection[];
  openCount: number;
  doneCount: number;
}

export interface LogEntry {
  date: string; // YYYY-MM-DD
  focus: string; // e.g. "decision"
  title: string;
  body: string;
}

export interface NowDoc {
  focus?: string;
  nextActions: string[];
  waiting: string[];
  someday: string[];
}

export interface ProjectInfo {
  goal?: string;
  shippedDefinition?: string;
  hardDeadline?: string;
  hardDeadlineDate?: string;
  currentPhase?: string;
  risks?: string;
  techStack?: string;
  lastSession?: string;
  decisionLog?: string;
  sections: Record<string, string>;
}

export interface HotDoc {
  lastUpdated?: string;
  currentState?: string;
  projectStates?: string;
  openDecisions?: string;
  activeThreads?: string;
  mtimeMs: number;
}

export interface VaultFileRef {
  name: string;
  relPath: string; // relative to vault root, forward-slashed
  absPath: string;
  group?: string; // top-level subfolder, if any
}

export interface Campaign {
  slug: string;
  name: string;
  type?: string;
  isLead: boolean;
  project: ProjectInfo;
  roadmap?: Roadmap;
  sessionCount: number;
  lastSessionDate?: string;
  phaseProgress: { done: number; active: number; total: number };
  dir: string;
  relDir: string;
  claudeRelPath?: string;
  roadmapRelPath?: string;
  roadmapAbsPath?: string;
  files: VaultFileRef[];
}

export interface Province {
  slug: string;
  name: string;
  todos?: TodosDoc;
  todosRelPath?: string;
  todosAbsPath?: string;
  openQuestCount: number;
  files: VaultFileRef[];
  dir: string;
  relDir: string;
}

export interface GreatSiege {
  label: string;
  date: string; // ISO
  daysLeft: number;
  weeksLeft: number;
}

// --- Gamification v2: domains, habits, goals, bosses, streaks ----------------

/** The five fronts of the empire. Every XP source maps to exactly one. */
export type DomainKey = "career" | "invest" | "health" | "learning" | "personal";

/** How often a recurring habit is due. */
export type Cadence =
  | { kind: "daily" }
  | { kind: "weekly"; day?: number } // 0=Sun..6=Sat anchor (optional)
  | { kind: "xPerWeek"; times: number } // e.g. PPL ~ 3×/wk
  | { kind: "onDays"; days: number[] }; // e.g. Mon/Wed/Fri

export interface Habit {
  id: string; // stable slug, e.g. "japanese-study"
  label: string; // "Japanese study"
  cadence: Cadence;
  domain: DomainKey;
  xp: number; // awarded per completion
  sourceRelPath: string; // where it's declared (habits.md)
}
export interface HabitsDoc {
  habits: Habit[];
}

/** A habit projected onto "today", with completion + streak state. */
export interface HabitToday extends Habit {
  dueToday: boolean;
  doneToday: boolean;
  logRelPath: string; // append target — canonical: habits-log.md
  weekProgress?: { done: number; need: number }; // for xPerWeek ("2/3")
  cadenceLabel: string; // human-readable cadence ("Mon", "daily", "2×/wk")
}

export interface HabitLogEntry {
  date: string; // YYYY-MM-DD
  habitId: string;
}

export interface StreakInfo {
  scope: "overall" | string; // habit id or "overall"
  current: number;
  best: number;
  atRisk: boolean; // current>0 && nothing logged today
  lastDate?: string; // ISO of last active day
}

export interface Goal {
  id: string;
  label: string; // "Body weight"
  start: number; // 64
  current: number; // 66.6
  target: number; // 70
  unit: string; // "kg"
  deadlineISO?: string;
  domain: DomainKey;
  sourceRelPath: string;
  pct: number; // clamp01((current-start)/(target-start))*100
}
export interface GoalsDoc {
  goals: Goal[];
}

export interface Boss {
  id: string;
  title: string;
  kind: "goal" | "deadline" | "combined";
  domain: DomainKey;
  progressPct?: number; // 0..100
  deadlineISO?: string;
  daysLeft?: number;
  state: "active" | "looming" | "defeated" | "breached";
  href?: string; // campaign/zone link
  detail?: string;
}

export interface Bounty {
  id: string;
  condition: string;
  domain: DomainKey;
  sourceRelPath: string;
}

export interface HoldingsData {
  generated?: string;
  byCurrency: { ccy: string; totalCost: number; dividends: number }[];
  positions: number;
  markets: number;
  recentDividends: { symbol: string; amount: number; ccy: string; date: string }[];
  byMarket: { market: string; weight: number; count: number }[]; // weight 0..1
  transactionCount?: number;
  milestones: { id: string; label: string; crossed: boolean; date?: string }[];
}

export interface DomainProgress {
  domain: DomainKey;
  title: string; // "The Barracks"
  zoneTitle2: string; // "Quartermaster of the Body"
  xp: number;
  level: number;
  levelTitle: string;
  pctToNext: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  momentum: number;
  attention?: string; // nudge text for realm-map badge
}

export interface RealmModel {
  campaigns: Campaign[];
  provinces: Province[];
  now?: NowDoc;
  hot?: HotDoc;
  recentLog: LogEntry[];
  logEntryCount: number;
  inboxCount: number;
  resourceCount: number;
  archiveCount: number;
  greatSiege?: GreatSiege;
  hotStale: boolean;
  scannedAtISO: string;
  vaultRoot: string;
  // v2 additions (all derived from durable vault state + append-only logs)
  habits: Habit[];
  habitLog: HabitLogEntry[];
  goals: Goal[];
  bounties: Bounty[];
  habitsLogRelPath: string; // canonical append target for completions
  todayISO: string; // server "today" (local), for client/server agreement
  dailyNoteToday: boolean; // a Daily_Notes/<today>.md exists
  activityDates: string[]; // dated signals (log.md + daily notes) for streaks
}
