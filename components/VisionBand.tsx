"use client";

import { useState } from "react";
import type { VisionView, VisionGoalView, VisionDomainGroup } from "@/lib/view";

/**
 * The "Vision 2026" rail — the annual goals horizon (VISION.md), compacted to a
 * single row of five domain dials so it frames the projects below without burying
 * them. Each dial shows that domain's momentum (mean goal progress); click one to
 * expand its individual goals beneath the rail. Dormant domains (no goal) read
 * muted. Default state is one row → the daily work stays above the fold.
 */
export function VisionBand({ vision }: { vision: VisionView }) {
  const [open, setOpen] = useState<string | null>(null);
  const title = vision.year ? `Vision ${vision.year}` : "Vision";
  const openGroup = open ? vision.domains.find((d) => d.domain === open) : undefined;

  return (
    <section className="vision" aria-label={title}>
      <div className="vision-bar">
        <div className="vision-id">
          <span className="vision-kicker">{title}</span>
          {vision.tagline && <span className="vision-tag">&ldquo;{vision.tagline}&rdquo;</span>}
        </div>
        <span className="vision-active">
          {vision.activeDomainCount}/{vision.totalDomainCount} domains active
        </span>
      </div>

      <div className="vision-rail">
        {vision.domains.map((d) => {
          const dormant = d.goals.length === 0;
          const isOpen = open === d.domain;
          return (
            <button
              key={d.domain}
              type="button"
              className={`vtile${dormant ? " dormant" : ""}${isOpen ? " open" : ""}`}
              aria-expanded={isOpen}
              aria-label={
                dormant
                  ? `${d.domain}: no goal set`
                  : `${d.domain}: ${d.aggPct}% across ${d.goalCount} goals — show detail`
              }
              disabled={dormant}
              onClick={() => setOpen(isOpen ? null : d.domain)}
            >
              <span className="vtile-top">
                <span className="vtile-dom">
                  <span className="vision-dot" style={{ background: d.accent }} aria-hidden="true" />
                  {d.domain}
                </span>
                <span className="vtile-pct">{dormant ? "—" : `${d.aggPct}%`}</span>
              </span>
              <span className="vtile-bar">
                <i style={{ width: `${dormant ? 0 : d.aggPct}%`, background: d.accent }} />
              </span>
              <span className="vtile-sub">
                {dormant ? "no goal yet" : `${d.goalCount} goal${d.goalCount !== 1 ? "s" : ""}`}
                {!dormant && <span className="vtile-caret" aria-hidden="true"> ›</span>}
              </span>
            </button>
          );
        })}
      </div>

      {openGroup && <DomainDetail group={openGroup} />}
    </section>
  );
}

function DomainDetail({ group }: { group: VisionDomainGroup }) {
  return (
    <div className="vision-detail">
      {group.goals.map((g, i) => <Goal key={i} g={g} />)}
    </div>
  );
}

function Goal({ g }: { g: VisionGoalView }) {
  if (g.kind === "milestone") {
    return (
      <div className="vision-goal">
        <div className="vision-goal-row">
          <span className="vision-goal-label">{g.label}</span>
          <span className={`st ${g.statusKey ?? "todo"}`}>{g.statusLabel}</span>
        </div>
        {g.date && <div className="vision-goal-note">by {g.date}</div>}
      </div>
    );
  }
  return (
    <div className="vision-goal">
      <div className="vision-goal-row">
        <span className="vision-goal-label">{g.label}</span>
        <span className="vision-goal-val">{g.valueLabel}</span>
      </div>
      <div className="bar"><i style={{ width: `${g.pct ?? 0}%`, background: g.accent }} /></div>
      {g.source === "derived" && g.linkSlug ? (
        <div className="vision-goal-note">↳ {g.linkSlug} · derived from roadmap</div>
      ) : g.date ? (
        <div className="vision-goal-note">by {g.date}</div>
      ) : null}
    </div>
  );
}
