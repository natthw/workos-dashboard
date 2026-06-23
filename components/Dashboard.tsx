"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FIGURES } from "@/lib/figures";
import type { DashView, ProjectCard } from "@/lib/view";
import type { RoadmapTasks, PhaseTasks } from "@/lib/roadmap-tasks";
import { Crown } from "./Crown";
import { TaskChecklist } from "./TaskChecklist";

function Img({ src, className }: { src: string; className: string }) {
  return (
    <img
      className={`ph ${className}`}
      src={src}
      alt=""
      loading="lazy"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function pickActivePhase(rt?: RoadmapTasks): PhaseTasks | null {
  if (!rt) return null;
  const ph = rt.phases;
  return (
    ph.find((p) => p.statusKey === "active" && p.total > 0) ||
    ph.find((p) => p.total > p.doneCount) ||
    ph.find((p) => p.total > 0) ||
    null
  );
}

function CardChrome({ p }: { p: ProjectCard }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {p.isLead && <span className="tag-chip lead-chip">★ Lead</span>}
      {p.parked && <span className="tag-chip parked-chip">Parked</span>}
    </div>
  );
}

function CrownBtn({ onCrown }: { onCrown: () => void }) {
  return (
    <button
      className="crown-btn"
      title="Make most important"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCrown(); }}
    >
      <Crown uid={`btn`} />
    </button>
  );
}

function CalmCard({ p, onCrown }: { p: ProjectCard; onCrown: () => void }) {
  return (
    <Link href={`/project/${p.slug}`} className="calm" style={{ opacity: p.parked ? 0.66 : 1 }}>
      <div className="calm-top">
        <div className="calm-img imgwrap"><Img src={p.img} className="" /></div>
        <div className="calm-body">
          <CardChrome p={p} />
          <div className="calm-name">{p.name}</div>
          {p.blurb && <div className="calm-why">{p.blurb}</div>}
        </div>
      </div>
      <div className="calm-foot">
        <div className="ft-row">
          <span>{p.done}/{p.total} {p.unit === "task" ? "tasks" : "phases"}{p.daysLeft != null ? ` · ${p.daysLeft}d left` : ""}</span>
          <b style={{ color: p.accent }}>{p.pct}%</b>
        </div>
        <div className="bar"><i style={{ width: `${p.pct}%`, background: p.accent }} /></div>
      </div>
      <CrownBtn onCrown={onCrown} />
    </Link>
  );
}

function BoldCard({ p, onCrown }: { p: ProjectCard; onCrown: () => void }) {
  return (
    <Link href={`/project/${p.slug}`} className="bold imgwrap" style={{ opacity: p.parked ? 0.7 : 1 }}>
      <Img src={p.img} className="bold-img" />
      <div className="bold-fade" />
      <div className="bold-body">
        <CardChrome p={p} />
        <div className="bold-pct" style={{ color: p.accent }}>{p.pct}%</div>
        <div className="bold-name">{p.name}</div>
        <div className="bar"><i style={{ width: `${p.pct}%`, background: p.accent }} /></div>
        <div className="bold-meta">{p.done} of {p.total} {p.unit === "task" ? "tasks" : "phases"} done{p.daysLeft != null ? ` · ${p.daysLeft} days left` : ""}</div>
      </div>
      <CrownBtn onCrown={onCrown} />
    </Link>
  );
}

export default function Dashboard({
  view,
  initialFigure,
  tasksBySlug,
}: {
  view: DashView;
  initialFigure: number;
  tasksBySlug: Record<string, RoadmapTasks>;
}) {
  const [figIdx, setFigIdx] = useState(initialFigure);
  const [style, setStyle] = useState<"calm" | "bold">("calm");
  const defaultFeatured =
    (view.projects.find((p) => p.isLead && !p.parked) ||
      view.projects.find((p) => !p.parked) ||
      view.projects[0])?.slug;
  const [featured, setFeatured] = useState<string | undefined>(defaultFeatured);

  useEffect(() => {
    const s = localStorage.getItem("tracker.cardStyle");
    if (s === "bold" || s === "calm") setStyle(s);
    const fSlug = localStorage.getItem("tracker.featured");
    if (fSlug && view.projects.some((p) => p.slug === fSlug)) setFeatured(fSlug);
  }, [view.projects]);

  function pickStyle(s: "calm" | "bold") {
    setStyle(s);
    try { localStorage.setItem("tracker.cardStyle", s); } catch {}
  }
  function crownIt(slug: string) {
    setFeatured(slug);
    try { localStorage.setItem("tracker.featured", slug); } catch {}
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const f = FIGURES[figIdx];
  const feat = view.projects.find((p) => p.slug === featured);
  const others = view.projects.filter((p) => p.slug !== featured);
  const featRt = featured ? tasksBySlug[featured] : undefined;
  const activePhase = pickActivePhase(featRt);
  const nowLine = view.now.focus ? view.now.focus.split("\n")[0].replace(/\*\*/g, "").slice(0, 240) : "";

  return (
    <>
      <div className="topbar">
        <Link href="/" className="brand">Tracker<span className="dot">.</span></Link>
        <span className="spacer" />
        {view.deadline && <span className="pill">⏳ <b>{view.deadline.daysLeft}d</b>&nbsp;· {view.deadline.label}</span>}
        <span className="pill">📋 {view.areas.length} areas</span>
      </div>

      <main>
        <div className="wrap">
          <div className="banner">
            <Img src={f.sceneImg} className="banner-scene" />
            <div className="banner-shade" />
            <div className="banner-in">
              <div className="portrait imgwrap"><span className="em">{f.emoji}</span><Img src={f.portrait} className="" /></div>
              <div className="b-txt">
                <div className="b-who"><span className="b-name">{f.name}</span><span className="b-years">{f.years}</span></div>
                <div className="b-quote">&ldquo;{f.quote}&rdquo;</div>
                <div className="b-legacy">{f.legacy}</div>
              </div>
            </div>
            <div className="b-scene-cap">backdrop: {f.scene}</div>
            <button className="spark" onClick={() => setFigIdx((figIdx + 1) % FIGURES.length)}>✦ Another spark</button>
          </div>

          {nowLine && (
            <div className="now-ribbon">
              <b>Now</b>
              <span>{nowLine}{view.now.focus && view.now.focus.length > 240 ? "…" : ""}</span>
            </div>
          )}
        </div>

        <div className="wrap">
          <div className="split">
            {/* Featured / most-important project */}
            {feat ? (
              <aside className="focus">
                <span className="focus-tag">👑 Most important</span>
                <div className="focus-hero imgwrap">
                  <Img src={feat.img} className="" />
                  <span className="crown-badge"><Crown uid={`feat-${feat.slug}`} /></span>
                  <span className="cap">📷 {feat.domain}{feat.parked ? " · parked" : ""}</span>
                </div>
                <Link className="focus-name" href={`/project/${feat.slug}`}>{feat.name}</Link>
                {feat.blurb && <div className="focus-why">{feat.blurb}</div>}
                <div className="bar-row"><span>Progress</span><b>{feat.pct}%</b></div>
                <div className="bar"><i style={{ width: `${feat.pct}%`, background: feat.accent }} /></div>

                {activePhase && featRt ? (
                  <>
                    <div className="focus-sec">{activePhase.name} · {activePhase.doneCount}/{activePhase.total}</div>
                    <TaskChecklist relPath={featRt.relPath} tasks={activePhase.tasks} />
                  </>
                ) : (
                  <div className="focus-why" style={{ marginTop: 12 }}>No checklist tasks in this project&rsquo;s roadmap yet.</div>
                )}
                <Link className="back" href={`/project/${feat.slug}`} style={{ marginTop: 12, paddingLeft: 0 }}>View full roadmap →</Link>
              </aside>
            ) : (
              <aside className="focus"><div className="focus-why">No projects found.</div></aside>
            )}

            {/* Other projects */}
            <div>
              <div className="col-hd">
                <h2>Projects</h2>
                <div className="toggle">
                  <button className={style === "calm" ? "on" : ""} onClick={() => pickStyle("calm")}>Calm</button>
                  <button className={style === "bold" ? "on" : ""} onClick={() => pickStyle("bold")}>Bold</button>
                </div>
              </div>

              {others.length ? (
                <div className="cards">
                  {others.map((p) =>
                    style === "calm"
                      ? <CalmCard key={p.slug} p={p} onCrown={() => crownIt(p.slug)} />
                      : <BoldCard key={p.slug} p={p} onCrown={() => crownIt(p.slug)} />
                  )}
                </div>
              ) : (
                <div className="empty"><div className="e">🎯</div>Your one focus is pinned on the left.</div>
              )}

              {view.goals.length > 0 && (
                <>
                  <div className="col-hd" style={{ margin: "30px 0 14px" }}><h2>Goals</h2></div>
                  {view.goals.map((g) => (
                    <div className="goal" key={g.label}>
                      <div className="goal-top">
                        <span className="goal-label">{g.label}</span>
                        <span className="goal-num"><b style={{ color: g.accent }}>{g.current}</b> / {g.target} {g.unit}</span>
                      </div>
                      <div className="bar"><i style={{ width: `${g.pct}%`, background: g.accent }} /></div>
                      <div className="goal-meta">{g.start} → {g.target} {g.unit} · {g.pct}%{g.deadline ? ` · by ${g.deadline}` : ""}</div>
                    </div>
                  ))}
                </>
              )}

              {view.habits.length > 0 && (
                <>
                  <div className="col-hd" style={{ margin: "30px 0 14px" }}><h2>Habits</h2></div>
                  {view.habits.map((h) => (
                    <div className={`habit ${h.doneToday ? "done" : ""}`} key={h.label}>
                      <span className={`habit-dot ${h.doneToday ? "on" : ""}`}>{h.doneToday ? "✓" : ""}</span>
                      <span className="habit-label">{h.keystone && <span className="key-chip">keystone</span>}{h.label}</span>
                      <span className="habit-cad">{h.cadence}</span>
                    </div>
                  ))}
                </>
              )}

              {view.areas.length > 0 && (
                <>
                  <div className="col-hd" style={{ margin: "30px 0 14px" }}><h2>Areas</h2></div>
                  <div className="cards">
                    {view.areas.map((a) => (
                      <div className="calm" key={a.slug} style={{ cursor: "default" }}>
                        <div className="calm-body" style={{ padding: 16 }}>
                          <div className="calm-name" style={{ fontSize: 15 }}>{a.name}</div>
                          <div className="mini-m">{a.openCount > 0 ? `${a.openCount} open todo${a.openCount !== 1 ? "s" : ""}` : "No open todos"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {view.hotStale && <div className="stale">⚠️ <b>hot.md</b> is stale — vault changed since the last cache refresh.</div>}
              <div className="mini-m" style={{ marginTop: 18, textAlign: "right" }}>
                Inbox {view.counts.inbox} · Resources {view.counts.resources} · Archive {view.counts.archive}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
