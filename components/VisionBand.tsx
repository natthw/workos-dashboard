"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { VisionView, VisionGoalView, VisionDomainGroup } from "@/lib/view";

/**
 * The "Vision 2026" rail — the annual goals horizon (VISION.md), compacted to a
 * single row of five domain dials so it frames the projects below without burying
 * them. Each dial shows that domain's momentum (mean goal progress); click one to
 * expand its individual goals beneath the rail. Dormant domains (no goal) read
 * muted. Default state is one row → the daily work stays above the fold.
 */
export function VisionBand({ vision, children }: { vision: VisionView; children?: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const title = vision.year ? `Vision ${vision.year}` : "Vision";

  // The detail floats over the page rather than displacing it, so it needs the
  // dismissals a popover is expected to have: Escape, and a click anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      // Return focus to the dial that opened it, rather than dropping to <body>.
      railRef.current?.querySelector<HTMLElement>(".vtile.open")?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (railRef.current?.contains(t)) return; // a dial handles its own toggle
      if ((t as Element).closest?.(".vision-detail")) return;
      setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  const openIndex = open ? vision.domains.findIndex((d) => d.domain === open) : -1;
  const openGroup = openIndex >= 0 ? vision.domains[openIndex] : undefined;
  // caret points at the clicked dial's centre so the panel reads as expanding from it
  const caretLeft = openGroup ? ((openIndex + 0.5) / vision.domains.length) * 100 : 0;

  return (
    <section className="vision" aria-label={title}>
      <div className="vision-bar">
        <div className="vision-id">
          <span className="vision-kicker">{title}</span>
          {vision.tagline && <span className="vision-tag">&ldquo;{vision.tagline}&rdquo;</span>}
          <a
            className="vision-plan"
            href="obsidian://open?vault=KnowledgeOS&file=wiki%2Fsynthesis%2Fcareer-and-success-self-model"
            title="Read the career & life self-model in KnowledgeOS"
          >
            read the plan ↗
          </a>
        </div>
        <span className="vision-active">
          {vision.activeDomainCount}/{vision.totalDomainCount} domains active
        </span>
      </div>

      <div className="vision-rail" ref={railRef}>
        {vision.domains.map((d) => {
          const dormant = d.goals.length === 0;
          const isOpen = open === d.domain;
          return (
            <button
              key={d.domain}
              type="button"
              className={`vtile${dormant ? " dormant" : ""}${isOpen ? " open" : ""}`}
              style={isOpen ? { borderColor: d.accent } : undefined}
              aria-expanded={isOpen}
              aria-label={
                dormant
                  ? `${d.domain}: no goal set`
                  : `${d.domain}: ${d.aggPct}% across ${d.goalCount} goal${d.goalCount !== 1 ? "s" : ""} — show detail`
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

      {/* zero-height anchor: the popover hangs off the rail without taking layout */}
      <div className="vision-detail-anchor">
        {openGroup && <DomainDetail group={openGroup} caretLeft={caretLeft} />}
      </div>
      {children && <div className="vision-habits">{children}</div>}
    </section>
  );
}

function DomainDetail({ group, caretLeft }: { group: VisionDomainGroup; caretLeft: number }) {
  return (
    <div className="vision-detail" style={{ borderTopColor: group.accent }}>
      <span
        className="vision-caret"
        style={{ left: `${caretLeft}%`, borderBottomColor: group.accent }}
        aria-hidden="true"
      />
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
