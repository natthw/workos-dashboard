"use client";

import { useState } from "react";
import type { HabitView } from "@/lib/view";

/** Short tab label: the habit name before its " — description" tail. */
function tabTitle(label: string): string {
  return label.split(/\s+[—–·]\s+/)[0].trim() || label;
}

/**
 * Daily habits as a compact, Chrome-style tab strip. The resting state is just
 * the one-line row, so the projects below sit above the fold; clicking one opens
 * its how-to in a connected panel, and clicking it again collapses it. Owns its
 * own active state — nothing else needs it.
 *
 * Semantically these are DISCLOSURES, not ARIA tabs. The markup used to claim
 * role="tablist"/"tab"/"tabpanel", which promises a keyboard contract this
 * component never implemented: no roving tabindex, no arrow-key navigation, no
 * selected tab (all four reported aria-selected="false"), and an aria-controls
 * pointing at a panel id that doesn't exist while the strip is closed. A screen
 * reader announced "tab list, 4 items" and then arrow keys did nothing. Buttons
 * with aria-expanded describe what this actually is, and Tab/Enter — which the
 * component does support — is the correct contract for it.
 */
export function HabitsReminder({ habits, vaultName }: { habits: HabitView[]; vaultName: string }) {
  const [active, setActive] = useState<string | null>(null);
  if (habits.length === 0) return null;

  const obsidian = (rel: string) =>
    `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(rel)}`;
  const activeIndex = habits.findIndex((h) => h.label === active);
  const current = activeIndex >= 0 ? habits[activeIndex] : null;

  return (
    <div className="habit-tabs">
      <div className="ht-bar" role="group" aria-label="Daily habits">
        <span className="ht-lead" aria-hidden="true">📓 Daily habits</span>
        {habits.map((h, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={h.label}
              id={`ht-tab-${i}`}
              type="button"
              aria-expanded={isActive}
              aria-controls={isActive ? "ht-panel" : undefined}
              className={`ht-tab ${isActive ? "active" : ""}`}
              onClick={() => setActive(isActive ? null : h.label)}
              // The visible label is truncated to the habit's short name; the
              // accessible name carries the whole thing, including the cadence.
              aria-label={`${h.label} · ${h.cadence}${h.keystone ? " · keystone habit" : ""}`}
              title={h.label}
            >
              {h.keystone && <span className="ht-star" aria-hidden="true">★</span>}
              <span className="ht-title">{tabTitle(h.label)}</span>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="ht-panel" id="ht-panel" role="region" aria-labelledby={`ht-tab-${activeIndex}`}>
          <div className="ht-panel-hd">
            <b>{current.label}</b>
            <span className="ht-panel-cad">{current.cadence}</span>
          </div>
          {current.detail.length > 0 ? (
            <ul className="ht-detail">
              {current.detail.map((d, idx) => <li key={idx}>{d}</li>)}
            </ul>
          ) : (
            <div className="ht-empty">No how-to noted for this one yet.</div>
          )}
          <a className="ht-open" href={obsidian(current.sourceRelPath)}>↗ Open in Obsidian</a>
        </div>
      )}
    </div>
  );
}
