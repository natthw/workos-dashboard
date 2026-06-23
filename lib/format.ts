// Client-safe formatting + status helpers (no node imports).

import type { StatusKey } from "./workos/types";

export interface StatusMeta {
  label: string;
  text: string; // text color class
  dot: string; // bg color class for a dot
  chip: string; // full chip classes (bg/text/border)
}

export function statusMeta(key: StatusKey): StatusMeta {
  switch (key) {
    case "done":
      return {
        label: "Done",
        text: "text-active",
        dot: "bg-active",
        chip: "bg-active/12 text-active border-active/25",
      };
    case "active":
      return {
        label: "Active",
        text: "text-gold-300",
        dot: "bg-gold-400",
        chip: "bg-gold-500/12 text-gold-300 border-gold-500/30",
      };
    case "todo":
      return {
        label: "Not started",
        text: "text-ink-dim",
        dot: "bg-ink-faint",
        chip: "bg-ink/5 text-ink-dim border-realm-borderlite",
      };
    default:
      return {
        label: "Unknown",
        text: "text-ink-dim",
        dot: "bg-ink-faint",
        chip: "bg-ink/5 text-ink-dim border-realm-borderlite",
      };
  }
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-08-01" → "Aug 1, 2026" */
export function formatISO(iso?: string): string {
  if (!iso) return "—";
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** Relative phrasing from today: "today", "in 5 days", "12 days ago". */
export function relDays(iso?: string, now: Date = new Date()): string {
  if (!iso) return "";
  const target = new Date(`${iso}T00:00:00`);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 0) return `in ${d} days`;
  return `${-d} days ago`;
}

export function pluralize(n: number, word: string, plural?: string): string {
  return `${n} ${n === 1 ? word : (plural ?? `${word}s`)}`;
}

/** Abbreviate large numbers: 48200 → "48.2K", 1_240_000 → "1.24M". */
export function abbrev(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return Number.isInteger(n) ? String(n) : n.toFixed(0);
  if (abs < 1_000_000) return `${trim(n / 1000)}K`;
  if (abs < 1_000_000_000) return `${trim(n / 1_000_000)}M`;
  return `${trim(n / 1_000_000_000)}B`;
}

function trim(n: number): string {
  // up to 2 sig decimals, no trailing zeros: 1.24, 48.2, 3
  return Number(n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)).toString();
}

/** Currency abbreviation with symbol, e.g. ("THB", 1_240_000) → "฿1.24M". */
const CCY_SYMBOL: Record<string, string> = {
  THB: "฿", USD: "$", GBP: "£", KRW: "₩", EUR: "€", JPY: "¥",
};
export function ccyAbbrev(ccy: string, n: number): string {
  const sym = CCY_SYMBOL[ccy.toUpperCase()] ?? "";
  return `${sym}${abbrev(n)}${sym ? "" : ` ${ccy}`}`;
}

/** Strip the most common inline markdown so a string is safe as plain text. */
export function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .trim();
}
