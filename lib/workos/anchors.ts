/**
 * Anchor-based, line-index-independent resolution of edit targets.
 *
 * Render-time line numbers go stale the moment an external editor (e.g. an LLM
 * agent) inserts or removes lines. These helpers re-locate the target in a
 * freshly-read file by its *content* so a concurrent edit can never cause a
 * wrong-line write. Ambiguous matches return null → the caller surfaces a
 * conflict instead of guessing.
 */

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * 0-based index of a todo line by its checkbox-stripped text, optionally scoped
 * to a `## section` heading. Returns null if not found or ambiguous (>1 match).
 */
export function findTodoLine(lines: string[], text: string, section?: string): number | null {
  const want = normalize(text);
  let inSection = section == null;
  const hits: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (section != null && heading) {
      inSection = normalize(heading[1]) === normalize(section);
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (m && normalize(m[2]) === want) hits.push(i);
  }
  return hits.length === 1 ? hits[0] : null;
}

/**
 * 0-based index of the `Status:` line belonging to a `## Phase…` heading
 * identified by its short name (e.g. "Phase 0"). Returns the first `Status:`
 * line under the matching heading, or null if the heading/line moved away.
 */
export function findPhaseStatusLine(lines: string[], phaseShortName: string): number | null {
  const want = normalize(phaseShortName);
  let inPhase = false;

  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      inPhase = normalize(heading[1]).startsWith(want);
      continue;
    }
    if (inPhase && /^\s*Status\s*:/i.test(lines[i])) return i;
  }
  return null;
}
