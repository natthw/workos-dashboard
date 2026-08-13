import type { WaitingDoc, WaitingItem } from "../types";

/**
 * Parse `WAITING.md` — the inverse of `NOW.md`. NOW is what you owe the work;
 * this is what the work is waiting on from you, one unmet human dependency per
 * line. The vault's line contract:
 *
 *   - [ ] <action> · owed: YYYY-MM-DD · unblocks: <chain> · how: <command or file>
 *
 * `owed:` is what makes the file worth having — without a date, a five-week
 * stall and a four-day one look identical. Everything after the action is
 * optional here: a line missing `how:` is malformed by the contract and
 * `/lint-workos` check H says so, but this parser still renders it rather than
 * dropping the item silently. Degrading gracefully is the standard's rule.
 */

/** Segment separator in the line contract. Values themselves never contain it. */
const SEP = "·";

function clean(t: string): string {
  return t.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
}

/** The section that holds real items; the rest of the file documents the contract. */
const ITEMS_HEADING = /blocked on you/i;

function parseItem(afterBox: string, checked: boolean, lineNumber: number): WaitingItem {
  const raw = afterBox.trim();
  const parts = raw.split(SEP).map((s) => s.trim());

  const item: WaitingItem = { text: clean(parts[0] ?? ""), raw, checked, lineNumber };
  for (const seg of parts.slice(1)) {
    const kv = seg.match(/^(owed|unblocks|how)\s*:\s*(.*)$/i);
    if (!kv) continue;
    const val = kv[2].trim();
    if (!val) continue;
    switch (kv[1].toLowerCase()) {
      case "owed": {
        // A malformed date is treated as absent, never an error — the same rule
        // every other consumer of the standard follows.
        const iso = val.match(/^\d{4}-\d{2}-\d{2}/);
        if (iso) item.owed = iso[0];
        break;
      }
      case "unblocks":
        item.unblocks = clean(val);
        break;
      case "how":
        item.how = clean(val);
        break;
    }
  }
  return item;
}

export function parseWaiting(lines: string[]): WaitingDoc {
  // The contract section carries a TEMPLATE line that is a valid-looking
  // checkbox. It lives in a fenced block, so fences are skipped outright — and
  // when the real `## Blocked on you` heading is present, only its items count.
  const hasItemsHeading = lines.some((ln) => {
    const h = ln.match(/^#{1,6}\s+(.+?)\s*$/);
    return h != null && ITEMS_HEADING.test(h[1]);
  });

  const items: WaitingItem[] = [];
  let section: string | undefined;
  let inSection = !hasItemsHeading; // no such heading → read the whole file
  let inFence = false;

  lines.forEach((ln, i) => {
    if (/^\s*```/.test(ln)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const h = ln.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h && hasItemsHeading) {
      inSection = ITEMS_HEADING.test(h[1]);
      if (inSection) section = h[1].trim();
      return;
    }
    if (!inSection) return;

    const cb = ln.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (cb && cb[2].trim()) {
      items.push(parseItem(cb[2], cb[1].toLowerCase() === "x", i));
    }
  });

  return { items, section };
}
