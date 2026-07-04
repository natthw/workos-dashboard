"use client";

import { useState } from "react";
import type { HabitView } from "@/lib/view";

/** Short tab label: the habit name before its " — description" tail. */
function tabTitle(label: string): string {
  return label.split(/\s+[—–·]\s+/)[0].trim() || label;
}

/**
 * Daily habits as a compact, Chrome-style tab strip. The resting state is just
 * the one-line tab row, so the projects below sit above the fold; clicking a tab
 * opens its how-to in a connected panel (Chrome-style), and clicking the active
 * tab again collapses it. Owns its own active-tab state — nothing else needs it.
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
      <div className="ht-bar" role="tablist" aria-label="Daily habits">
        <span className="ht-lead">📓 Daily habits</span>
        {habits.map((h, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={h.label}
              id={`ht-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="ht-panel"
              className={`ht-tab ${isActive ? "active" : ""}`}
              onClick={() => setActive(isActive ? null : h.label)}
              title={h.label}
            >
              {h.keystone && <span className="ht-star" aria-hidden="true">★</span>}
              <span className="ht-title">{tabTitle(h.label)}</span>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="ht-panel" id="ht-panel" role="tabpanel" aria-labelledby={`ht-tab-${activeIndex}`}>
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
