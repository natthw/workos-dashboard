import type { TodosDoc, TodoSection } from "../types";

/**
 * Parse a todos.md into sections of checkbox quests + context notes.
 * Line numbers map to the raw file for the toggle write-back.
 *
 *   ## CoreDB data reconciliation
 *   - [ ] **IONQ — ...** ... _(added 2026-06-04)_
 *   - plain bullet → kept as a read-only note
 */
export function parseTodos(lines: string[]): TodosDoc {
  const sections: TodoSection[] = [];
  let cur: TodoSection = { heading: "", items: [], notes: [] };

  const push = () => {
    if (cur.heading || cur.items.length || cur.notes.length) sections.push(cur);
  };

  lines.forEach((line, i) => {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      push();
      cur = { heading: h2[1].trim(), items: [], notes: [] };
      return;
    }
    const cb = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (cb) {
      const checked = cb[1].toLowerCase() === "x";
      const text = cb[2].trim();
      const added = text.match(/\(added\s+(\d{4}-\d{2}-\d{2})\)/i);
      cur.items.push({
        text,
        raw: line,
        checked,
        lineNumber: i,
        addedDate: added?.[1],
        section: cur.heading,
      });
      return;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet && bullet[1].trim()) {
      cur.notes.push({ text: bullet[1].trim(), section: cur.heading });
    }
  });
  push();

  const items = sections.flatMap((s) => s.items);
  return {
    sections,
    openCount: items.filter((x) => !x.checked).length,
    doneCount: items.filter((x) => x.checked).length,
  };
}
