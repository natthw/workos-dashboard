"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FIGURES } from "@/lib/figures";
import type { DashView, DeadlineLabel, ProjectCard } from "@/lib/view";
import type { RoadmapTasks } from "@/lib/roadmap-tasks";
import { pickActivePhase } from "@/lib/phase";
import { Crown } from "./Crown";
import { TaskChecklist } from "./TaskChecklist";
import { RemoteImage } from "./RemoteImage";
import { NowTicker } from "./NowTicker";
import { HabitsReminder } from "./HabitsReminder";
import { VisionBand } from "./VisionBand";
import { WaitingStrip } from "./WaitingStrip";
import { Board } from "./Board";
import type { BoardView } from "@/lib/board";
import { Prose } from "./Prose";

type CardStyle = "calm" | "bold";
/** Which lens the projects column is showing: what matters, or what's moving. */
type Lens = "eisenhower" | "board";

function setPrefCookie(key: string, value: string) {
  try {
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* cookies disabled — preference simply won't persist */
  }
}

// A self-contained deadline indicator: the ⏳ icon (same as the header pill) makes
// it read as a *deadline* rather than a task metric, so it stands on its own line
// away from the task counts — answering "what is this / what does it belong to".
//
// The copy and tone come from deadlineLabel() in lib/view.ts, the single rule
// shared with the header pill and the project detail page. The terse text is for
// the eye; srText carries the spoken form, because "6d" reads as "six d".
function DeadlineChip({ due }: { due: DeadlineLabel }) {
  return (
    <span className={`deadline-chip ${due.tone}`}>
      <span aria-hidden="true">⏳</span>
      <span aria-hidden="true">{due.text}</span>
      <span className="vh">{due.srText}</span>
    </span>
  );
}

// "12d" is for the eye; spoken it reads as "twelve d". Every age badge pairs the
// terse form with this one in its accessible name — same split as DeadlineChip.
function ageWords(days: number): string {
  if (days === 0) return "today";
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function CardChrome({ p }: { p: ProjectCard }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {p.isLead && <span className="tag-chip lead-chip">Urgent + important</span>}
      {p.parked && <span className="tag-chip parked-chip">Parked</span>}
    </div>
  );
}

function CrownBtn({ p, onCrown }: { p: ProjectCard; onCrown: () => void }) {
  return (
    <button
      type="button"
      className="crown-btn"
      aria-label={`Pin ${p.name} as the most important project`}
      title="Pin as most important"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCrown(); }}
    >
      <Crown uid="btn" />
    </button>
  );
}

// The card is a positioned container; the title link stretches via ::after to
// cover the whole card, and the crown button is a *sibling* on top — so we never
// nest an interactive <button> inside an <a> (valid HTML, predictable for AT).
function CalmCard({ p, onCrown }: { p: ProjectCard; onCrown: () => void }) {
  return (
    <div className="calm card-link" style={{ opacity: p.parked ? 0.66 : 1 }}>
      <div className="calm-top">
        <div className="calm-img imgwrap"><RemoteImage src={p.img} sizes="96px" /></div>
        <div className="calm-body">
          <CardChrome p={p} />
          <div className="calm-name">
            <Link href={`/project/${p.slug}`} className="stretch-link">{p.name}</Link>
          </div>
          {p.blurb && <div className="calm-why"><Prose text={p.blurb} /></div>}
        </div>
      </div>
      <div className="calm-foot">
        <div className="ft-row">
          <span>{p.done}/{p.total} {p.unit === "task" ? "tasks" : "phases"}</span>
          {/* Same fact as BoldCard's "Not started" — Calm just says it inline
              instead of in its own display line, matching the card's smaller
              footprint. Toggling Calm/Bold changes styling, never information. */}
          <b style={{ color: p.pct > 0 ? p.accent : undefined }}>{p.pct > 0 ? `${p.pct}%` : "Not started"}</b>
        </div>
        <div className="bar"><i style={{ width: `${p.pct}%`, background: p.accent }} /></div>
        {p.due && <div className="foot-deadline"><DeadlineChip due={p.due} /></div>}
      </div>
      <CrownBtn p={p} onCrown={onCrown} />
    </div>
  );
}

function BoldCard({ p, onCrown }: { p: ProjectCard; onCrown: () => void }) {
  return (
    <div className="bold imgwrap card-link" style={{ opacity: p.parked ? 0.7 : 1 }}>
      <RemoteImage src={p.img} className="ph bold-img" sizes="(max-width:880px) 100vw, 340px" />
      <div className="bold-fade" />
      <div className="bold-body">
        <CardChrome p={p} />
        {p.pct > 0
          ? <div className="bold-pct" style={{ color: p.accent }}>{p.pct}%</div>
          : <div className="bold-notstarted">Not started</div>}
        <div className="bold-name">
          <Link href={`/project/${p.slug}`} className="stretch-link">{p.name}</Link>
        </div>
        <div className="bar"><i style={{ width: `${p.pct}%`, background: p.accent }} /></div>
        <div className="bold-meta">{p.done} of {p.total} {p.unit === "task" ? "tasks" : "phases"} done</div>
        {p.due && <div className="foot-deadline"><DeadlineChip due={p.due} /></div>}
      </div>
      <CrownBtn p={p} onCrown={onCrown} />
    </div>
  );
}

export default function Dashboard({
  view,
  initialFigure,
  tasksBySlug,
  initialStyle = "calm",
  initialFeatured,
  initialBannerOpen = false,
  initialWaitingOpen = false,
  initialLens = "eisenhower",
  board,
}: {
  view: DashView;
  initialFigure: number;
  tasksBySlug: Record<string, RoadmapTasks>;
  initialStyle?: CardStyle;
  initialFeatured?: string;
  initialBannerOpen?: boolean;
  initialWaitingOpen?: boolean;
  initialLens?: Lens;
  board?: BoardView;
}) {
  const [figIdx, setFigIdx] = useState(initialFigure);
  const [style, setStyle] = useState<CardStyle>(initialStyle);
  const [bannerOpen, setBannerOpen] = useState(initialBannerOpen);
  const [lens, setLens] = useState<Lens>(initialLens);
  const defaultFeatured =
    (view.projects.find((p) => p.isLead && !p.parked) ||
      view.projects.find((p) => !p.parked) ||
      view.projects[0])?.slug;
  // Persisted choice comes from a server-read cookie → first paint already matches,
  // so there's no Calm→Bold / featured re-shuffle flash after hydration.
  const [featured, setFeatured] = useState<string | undefined>(
    initialFeatured && view.projects.some((p) => p.slug === initialFeatured)
      ? initialFeatured
      : defaultFeatured,
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openArea, setOpenArea] = useState<string | null>(null);

  function pickStyle(s: CardStyle) {
    setStyle(s);
    setPrefCookie("workos.cardStyle", s);
  }
  function pickLens(l: Lens) {
    setLens(l);
    setPrefCookie("workos.lens", l);
  }
  function toggleBanner() {
    const next = !bannerOpen;
    setBannerOpen(next);
    setPrefCookie("workos.bannerOpen", next ? "1" : "0");
  }
  function crownIt(slug: string, name: string) {
    setFeatured(slug);
    setPrefCookie("workos.featured", slug);
    setToast(`Pinned “${name}” as most important`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
    if (typeof window !== "undefined") {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
  }

  const f = FIGURES[figIdx];
  const feat = view.projects.find((p) => p.slug === featured);
  const others = view.projects.filter((p) => p.slug !== featured);
  // Eisenhower placement: the not-urgent/not-important (someday/parked) quadrant
  // collapses into a dropdown, per the WorkOS standard; everything else stays
  // visible as cards (already ordered by band → priority by the scanner).
  const activeOthers = others.filter((p) => !p.parked);
  const somedayOthers = others.filter((p) => p.parked);
  const featRt = featured ? tasksBySlug[featured] : undefined;
  const activePhase = pickActivePhase(featRt);

  const renderCard = (p: ProjectCard) =>
    style === "calm" ? (
      <CalmCard key={p.slug} p={p} onCrown={() => crownIt(p.slug, p.name)} />
    ) : (
      <BoldCard key={p.slug} p={p} onCrown={() => crownIt(p.slug, p.name)} />
    );

  return (
    <>
      {/* The page had no <h1> at all — heading navigation offered only "Projects"
          and "Areas". The visible title is the brand link in the banner topbar,
          which is also on the project route, so promoting it there would give
          that page two h1s. */}
      <h1 className="vh">WorkOS Dashboard — what to work on now</h1>
      <NowTicker focus={view.now.focus} />

      <div className={`banner banner-hero${bannerOpen ? " open" : ""}`}>
        <RemoteImage src={f.sceneImg} className="banner-scene" sizes="100vw" priority unoptimized={f.scenePersonal} />
        <div className="banner-shade" />
        <header className="topbar banner-topbar">
          <Link href="/" className="brand">WorkOS Dashboard<span className="brand-dot">.</span></Link>
          <span className="spacer" />
          {view.deadline && (
            <span className={`pill pill-${view.deadline.due.tone}`}>
              <span aria-hidden="true">⏳</span>
              <b aria-hidden="true">{view.deadline.due.text}</b>
              <span className="vh">{view.deadline.due.srText}, </span>
              <span aria-hidden="true">&nbsp;· </span>
              {view.deadline.label}
            </span>
          )}
          <span className="pill"><span aria-hidden="true">📋</span> {view.areas.length} areas</span>
        </header>
        <div className="banner-content">
          <div className="banner-in">
            <div className="portrait imgwrap"><span className="em" aria-hidden="true">{f.emoji}</span><RemoteImage src={f.portrait} sizes="122px" alt={`Portrait of ${f.name}`} unoptimized /></div>
            <div className="b-txt">
              {/* Quote leads, attribution follows — the encouragement is the payload,
                  and this order survives being clamped to one line when collapsed. */}
              <div className="b-quote">&ldquo;{f.quote}&rdquo;</div>
              <div className="b-who"><span className="b-name">{f.name}</span><span className="b-years">{f.years}</span></div>
              {/* grid-template-rows rather than height/max-height: the same reveal
                  idiom as .done-wrap, and it doesn't animate a layout property. */}
              <div className="b-extra">
                <div className="b-extra-in">
                  <div className="b-legacy">{f.legacy}</div>
                  <div className="b-scene-cap">backdrop: {f.scene}</div>
                </div>
              </div>
            </div>
            <div className="b-controls">
              <button
                type="button"
                className="b-more"
                aria-expanded={bannerOpen}
                aria-label={bannerOpen ? `Collapse ${f.name}` : `Show ${f.name}'s legacy and backdrop`}
                onClick={toggleBanner}
              >
                <span className="b-more-caret" aria-hidden="true">▾</span>
                {bannerOpen ? "Less" : "Legacy"}
              </button>
              <button type="button" className="spark" onClick={() => setFigIdx((figIdx + 1) % FIGURES.length)}><span aria-hidden="true">✦</span> Another spark</button>
            </div>
          </div>
        </div>
      </div>

      <main id="main">
        {/* Blocked-on-you sits ABOVE the work on purpose: it is the one thing
            that stops a chain moving, and it renders nothing at all when the
            ledger is empty — which is the goal state, so it usually costs
            nothing. One line at rest keeps the projects where they are. */}
        {view.waiting && (
          <div className="wrap" style={{ marginTop: 16 }}>
            <WaitingStrip
              waiting={view.waiting}
              initialOpen={initialWaitingOpen}
              onOpenChange={(o) => setPrefCookie("workos.waitingOpen", o ? "1" : "0")}
            />
          </div>
        )}

        {view.vision ? (
          <div className="wrap" style={{ marginTop: 16 }}>
            <VisionBand vision={view.vision}>
              <HabitsReminder habits={view.habits} vaultName={view.vaultName} />
            </VisionBand>
          </div>
        ) : (
          <div className="wrap" style={{ marginTop: 16 }}>
            <HabitsReminder habits={view.habits} vaultName={view.vaultName} />
          </div>
        )}

        <div className="wrap" style={{ marginTop: 16 }}>
          <div className="split">
            {/* Featured / most-important project */}
            {feat ? (
              <aside className="focus" aria-label="Most important project">
                <span className="focus-tag"><span aria-hidden="true">★</span> Most important</span>
                {/* Picture + title are one click target (stretch-link idiom, same
                    as the project cards) → clicking the hero image opens the
                    project, not just the small title link. */}
                <div className="focus-head">
                  <div className="focus-hero imgwrap">
                    <RemoteImage src={feat.img} sizes="352px" />
                    <span className="crown-badge" aria-hidden="true"><Crown uid={`feat-${feat.slug}`} /></span>
                    <span className="cap"><span aria-hidden="true">📷</span> {feat.domain}{feat.parked ? " · parked" : ""}</span>
                  </div>
                  <Link className="focus-name stretch-link" href={`/project/${feat.slug}`}>{feat.name}</Link>
                </div>
                {feat.blurb && <div className="focus-why" title={feat.blurb}><Prose text={feat.blurb} /></div>}
                <div className="bar-row"><span>Progress</span><b>{feat.pct > 0 ? `${feat.pct}%` : "Not started"}</b></div>
                <div className="bar"><i style={{ width: `${feat.pct}%`, background: feat.accent }} /></div>

                {activePhase && featRt ? (
                  <>
                    <div className="focus-sec">{activePhase.name} · {activePhase.doneCount}/{activePhase.total}</div>
                    <TaskChecklist relPath={featRt.relPath} tasks={activePhase.tasks} limit={3} />
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
                {/* Two lenses on the same data: Eisenhower answers what matters,
                    the board answers what is moving. Tabs, never a replacement. */}
                <div className="toggle" role="group" aria-label="View">
                  <button type="button" className={lens === "eisenhower" ? "on" : ""} aria-pressed={lens === "eisenhower"} onClick={() => pickLens("eisenhower")}>Priority</button>
                  <button type="button" className={lens === "board" ? "on" : ""} aria-pressed={lens === "board"} onClick={() => pickLens("board")}>Board</button>
                </div>
                {lens === "eisenhower" && (
                  <div className="toggle" role="group" aria-label="Card style">
                    <button type="button" className={style === "calm" ? "on" : ""} aria-pressed={style === "calm"} onClick={() => pickStyle("calm")}>Calm</button>
                    <button type="button" className={style === "bold" ? "on" : ""} aria-pressed={style === "bold"} onClick={() => pickStyle("bold")}>Bold</button>
                  </div>
                )}
              </div>

              {lens === "board" ? (
                board ? (
                  <Board board={board} />
                ) : (
                  <div className="empty"><div className="e" aria-hidden="true">🗂️</div>No tasks to place on the board.</div>
                )
              ) : (
                <>
                  {activeOthers.length ? (
                    <div className="cards">{activeOthers.map(renderCard)}</div>
                  ) : somedayOthers.length === 0 ? (
                    <div className="empty"><div className="e" aria-hidden="true">🎯</div>Your one focus is pinned on the left.</div>
                  ) : null}

                  {somedayOthers.length > 0 && (
                    <details className="someday-fold">
                      <summary>
                        <span className="someday-caret" aria-hidden="true">▸</span>
                        <span>Someday / parked</span>
                        <span className="someday-count">{somedayOthers.length}</span>
                      </summary>
                      <div className="cards" style={{ marginTop: 14 }}>{somedayOthers.map(renderCard)}</div>
                    </details>
                  )}
                </>
              )}

              {view.areas.length > 0 && (() => {
                const STALE_DAYS = 30; // an area silently untouched this long gets flagged
                const open = view.areas.find((a) => a.slug === openArea);
                return (
                  <>
                    <div className="col-hd" style={{ margin: "22px 0 10px" }}><h2>Areas</h2></div>
                    <div className="area-row">
                      {view.areas.map((a) => {
                        const stale = a.lastTouchedDays != null && a.lastTouchedDays > STALE_DAYS;
                        const isOpen = openArea === a.slug;
                        // The chip reads "Career 33d" on screen; spoken, that is
                        // two unexplained numbers. The accessible name says what
                        // they mean. The old `title` contradicted it outright —
                        // "Career33d" announced, "No open todos" on hover.
                        const todos = a.openCount > 0
                          ? `${a.openCount} open todo${a.openCount !== 1 ? "s" : ""}`
                          : "no open todos";
                        const age = stale ? `, last touched ${a.lastTouchedDays} days ago` : "";
                        return (
                          <button
                            type="button"
                            className={`area-chip ${a.openCount > 0 ? "has-open" : ""}${stale ? " stale" : ""}${isOpen ? " open" : ""}`}
                            key={a.slug}
                            aria-expanded={isOpen}
                            aria-controls={isOpen ? "area-panel" : undefined}
                            aria-label={`${a.name}: ${todos}${age}`}
                            onClick={() => setOpenArea(isOpen ? null : a.slug)}
                          >
                            <span className="area-chip-name" aria-hidden="true">{a.name}</span>
                            {a.openCount > 0 && <span className="area-chip-count" aria-hidden="true">{a.openCount}</span>}
                            {stale && (
                              <span className="area-chip-age" aria-hidden="true" title={`Untouched for ${a.lastTouchedDays} days`}>
                                {a.lastTouchedDays}d
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {open && (
                      <div className="area-panel" id="area-panel" role="region" aria-label={`${open.name} detail`}>
                        <div className="area-panel-meta">
                          {open.openCount > 0
                            ? `${open.openCount} open todo${open.openCount !== 1 ? "s" : ""}`
                            : "No open todos"}
                          {" · "}
                          {open.fileCount} file{open.fileCount !== 1 ? "s" : ""}
                          {open.lastTouchedDays != null && (
                            <> · last touched {open.lastTouchedDays === 0 ? "today" : `${open.lastTouchedDays}d ago`}</>
                          )}
                        </div>
                        {open.goals.length > 0 ? (
                          open.goals.map((g) => (
                            <div className="area-goal" key={g.label}>
                              <div className="area-goal-top">
                                <span className="area-goal-label">{g.label}</span>
                                <span className="area-goal-num">
                                  <b>{g.current}</b> / {g.target}
                                  {g.unit ? ` ${g.unit}` : ""}
                                  {g.dateText ? ` · by ${g.dateText}` : ""}
                                </span>
                              </div>
                              <div className="bar"><i style={{ width: `${g.pct}%`, background: "var(--accent)" }} /></div>
                            </div>
                          ))
                        ) : (
                          <div className="area-goal-empty">No metric goals — backlog / reference only.</div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="stat-row">
                {/* The Inbox count says how much is queued; the age badge says
                    whether anyone is draining it. Six items is fine — six items
                    whose oldest is 42 days is sediment. */}
                <span
                  className="stat-chip"
                  aria-label={
                    `${view.counts.inbox} inbox item${view.counts.inbox !== 1 ? "s" : ""}` +
                    (view.inboxAge ? `, oldest ${ageWords(view.inboxAge.days)}` : "")
                  }
                >
                  <b aria-hidden="true">{view.counts.inbox}</b>
                  <span aria-hidden="true">Inbox</span>
                  {view.inboxAge && (
                    <span
                      className={`stat-chip-age lvl-${view.inboxAge.level}`}
                      aria-hidden="true"
                      title={`Oldest item captured ${ageWords(view.inboxAge.days)}`}
                    >
                      {view.inboxAge.days}d
                    </span>
                  )}
                </span>
                <span className="stat-chip"><b>{view.counts.resources}</b> Resources</span>
                <span className="stat-chip"><b>{view.counts.archive}</b> Archive</span>
                {/* Root anchor surfaces. Nothing else in LifeOS reports when these
                    go stale, so they rot unseen — this is the only daily surface
                    that can say so. Same chip + age-badge pattern as the areas. */}
                {view.freshness.map((f) => (
                  <span
                    key={f.file}
                    className="stat-chip"
                    aria-label={`${f.file} last touched ${ageWords(f.days)}`}
                  >
                    <span className="stat-chip-file" aria-hidden="true">{f.file}</span>
                    <span
                      className={`stat-chip-age lvl-${f.level}`}
                      aria-hidden="true"
                      title={`Last touched ${ageWords(f.days)}`}
                    >
                      {f.days}d
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
