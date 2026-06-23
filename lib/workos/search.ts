import fs from "node:fs";
import path from "node:path";
import { getVaultRoot, toRel } from "./paths";
import { scanRealm } from "./scan";

export interface SearchEntry {
  id: string;
  type: "action" | "campaign" | "province" | "file";
  label: string;
  sub?: string;
  href: string;
  keywords?: string;
}

const SKIP_DIRS = new Set([".obsidian", ".claude", "node_modules", "04_Archive"]);

function walkAll(dir: string, out: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.isDirectory()) {
      if (e.name.startsWith(".")) continue;
      walkAll(path.join(dir, e.name), out);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      out.push(path.join(dir, e.name));
    }
  }
}

/** Flat, navigable index of everything in the realm — powers the ⌘K palette. */
export function buildSearchIndex(): SearchEntry[] {
  const root = getVaultRoot();
  const realm = scanRealm();
  const entries: SearchEntry[] = [];

  entries.push(
    { id: "a-today", type: "action", label: "Daily Muster", sub: "Today — habits, quests, check-in", href: "/", keywords: "today home muster habits streak check-in daily loop" },
    { id: "a-command", type: "action", label: "Command Center", sub: "Full realm overview", href: "/command", keywords: "dashboard overview campaigns provinces" },
    { id: "a-realm", type: "action", label: "Realm Map", sub: "Zone hub — the five fronts", href: "/realm", keywords: "zones domains fronts map travel" },
    { id: "a-skills", type: "action", label: "Skill Tree", sub: "All domains at a glance", href: "/skills", keywords: "domains levels skill tree progression" },
    { id: "a-bosses", type: "action", label: "Boss Battles", sub: "Goals & deadlines", href: "/bosses", keywords: "boss goals deadlines siege countdown bounty" },
    { id: "a-war", type: "action", label: "War Table", sub: "All quests & phases", href: "/war-table", keywords: "todos quests roadmap phases actions board" },
    { id: "a-treasury", type: "action", label: "Treasury", sub: "Holdings (read-only, CoreDB)", href: "/treasury", keywords: "portfolio holdings investments coredb money value dividends" },
    { id: "a-settings", type: "action", label: "Settings", sub: "Accessibility & HUD", href: "/settings", keywords: "settings accessibility font scale motion colorblind contrast" },
    { id: "z-health", type: "action", label: "Go to the Barracks", sub: "Health zone", href: "/zone/health", keywords: "health barracks workout ppl training" },
    { id: "z-learning", type: "action", label: "Go to the Academy", sub: "Learning zone", href: "/zone/learning", keywords: "learning academy japanese study music" },
    { id: "z-career", type: "action", label: "Go to the Court", sub: "Career zone", href: "/zone/career", keywords: "career court work guild leadership" },
    { id: "z-invest", type: "action", label: "Go to the Treasury (zone)", sub: "Investments zone", href: "/zone/invest", keywords: "investments treasury portfolio" },
    { id: "z-personal", type: "action", label: "Go to the Hearth", sub: "Personal zone", href: "/zone/personal", keywords: "personal hearth home life" },
  );

  for (const c of realm.campaigns) {
    entries.push({
      id: `c-${c.slug}`,
      type: "campaign",
      label: c.name,
      sub: `Campaign${c.isLead ? " · LEAD" : ""}`,
      href: `/campaign/${encodeURIComponent(c.slug)}`,
      keywords: `project ${c.type ?? ""}`,
    });
  }

  for (const p of realm.provinces) {
    entries.push({
      id: `p-${p.slug}`,
      type: "province",
      label: p.name,
      sub: `Province · ${p.openQuestCount} open quests`,
      href: `/province/${encodeURIComponent(p.slug)}`,
      keywords: "area",
    });
  }

  const files: string[] = [];
  walkAll(root, files);
  for (const abs of files) {
    const rel = toRel(abs);
    entries.push({
      id: `f-${rel}`,
      type: "file",
      label: path.basename(abs).replace(/\.md$/i, ""),
      sub: rel,
      href: `/file/${rel.split("/").map(encodeURIComponent).join("/")}`,
      keywords: rel.replace(/[/_-]/g, " "),
    });
  }

  return entries;
}
