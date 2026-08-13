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

export interface NowDoc {
  focus?: string;
  nextActions: string[];
  waiting: string[];
  someday: string[];
}

/**
 * The `## Eisenhower` block (the WorkOS standard's project-priority contract):
 *   Priority: P1   Urgent: yes   Important: yes   Status: active
 * Urgent/Important pick the quadrant + display band; Priority (1=P1..5=P5) orders
 * within it; Status is the work-state, separate from the band.
 */
export interface Eisenhower {
  priority?: number; // 1..5 (P1 = highest)
  urgent?: boolean;
  important?: boolean;
  status?: string; // lowercased: active | parked | someday | closing-out | done
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
  eisenhower?: Eisenhower;
  sections: Record<string, string>;
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

/** One numeric metric from an area's goals.md: `Label: start → current → target unit by <date>`. */
export interface AreaGoal {
  label: string;
  start: number;
  current: number;
  target: number;
  unit?: string;
  dateText?: string; // raw "by …" tail, if present
}

export interface Province {
  slug: string;
  name: string;
  todos?: TodosDoc;
  todosRelPath?: string;
  todosAbsPath?: string;
  openQuestCount: number;
  goals: AreaGoal[]; // numeric metrics from goals.md (empty when the file is absent)
  goalsRelPath?: string;
  fileCount: number; // every .md the area holds (the "this area exists" signal)
  lastTouchedMs?: number; // newest mtime across ALL the area's .md files (anti-rot signal)
  files: VaultFileRef[];
  dir: string;
  relDir: string;
}

/** The nearest dated project deadline across the realm (drives the top-bar pill). */
export interface GreatSiege {
  label: string;
  date: string; // ISO
  daysLeft: number;
}

// --- domains & habits --------------------------------------------------------

/** The five life areas. Every project/area/habit maps to exactly one. */
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
  xp: number; // declared per-completion weight (kept for fidelity with habits.md)
  sourceRelPath: string; // where it's declared (habits.md)
  detail?: string[]; // how-to-implement lines (indented bullets under the habit in habits.md)
}
export interface HabitsDoc {
  habits: Habit[];
}

export interface HabitLogEntry {
  date: string; // YYYY-MM-DD
  habitId: string;
}

// --- vision (the annual goals horizon, from root VISION.md) -------------------

export type VisionGoalKind = "metric" | "milestone";

/** One line from VISION.md: a measurable outcome (metric) or a yes/no (milestone). */
export interface VisionGoal {
  label: string;
  domain: DomainKey;
  kind: VisionGoalKind;
  // metric: start → current → target unit
  start?: number;
  current?: number; // manual current; the view derives it from a linked project instead
  target?: number;
  unit?: string;
  // milestone
  statusKey?: StatusKey;
  // shared
  date?: string; // ISO target date ("by …")
  projectSlug?: string; // [[slug]] link to a campaign; progress derives from its roadmap
  sourceRelPath: string; // VISION.md, relative to vault root
  lineNumber: number; // 0-based, reserved for future write-back
}

export interface VisionDoc {
  year?: number; // from "# Vision 2026"
  tagline?: string; // from a leading "> …" blockquote
  goals: VisionGoal[];
}

/** One unmet human dependency from WAITING.md — a chain stopped until you act. */
export interface WaitingItem {
  text: string; // cleaned action, for display
  raw: string; // exact text after "[ ]" — the write-back anchor
  checked: boolean;
  lineNumber: number; // 0-based
  owed?: string; // ISO date the input was FIRST asked for (back-dated honestly)
  unblocks?: string; // what moves when it clears — also the hooks' identity key
  how?: string; // the physical start-line: a command to run or a file to open
}

export interface WaitingDoc {
  items: WaitingItem[];
  /** Heading the items sit under, so a write can be anchor-scoped to it. */
  section?: string;
}

export interface RealmModel {
  campaigns: Campaign[];
  provinces: Province[];
  now?: NowDoc;
  /** WAITING.md — what the work is waiting on from you (undefined if absent). */
  waiting?: WaitingDoc;
  waitingRelPath?: string;
  inboxCount: number;
  /** Whole days since the OLDEST inbox item was captured (undefined = empty). */
  inboxOldestAgeDays?: number;
  resourceCount: number;
  archiveCount: number;
  /** Last-touched mtimes (ms) of the root anchor surfaces; undefined = missing. */
  rootFreshness: { now?: number; vision?: number; hot?: number };
  greatSiege?: GreatSiege;
  scannedAtISO: string;
  // habits read live from habits.md + the append-only habits-log.md
  habits: Habit[];
  habitLog: HabitLogEntry[];
  // annual goals horizon, read live from root VISION.md (undefined if absent)
  vision?: VisionDoc;
  todayISO: string; // server "today" (local), for client/server agreement
}
