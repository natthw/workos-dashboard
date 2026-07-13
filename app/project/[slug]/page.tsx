import { buildCampaign } from "@/lib/workos/scan";
import { campaignToCard } from "@/lib/view";
import { readRoadmapTasks, type PhaseTasks } from "@/lib/roadmap-tasks";
import { TaskChecklist } from "@/components/TaskChecklist";
import { FreshnessProbe } from "@/components/FreshnessProbe";
import { RemoteImage } from "@/components/RemoteImage";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { done: "Done", active: "Active", todo: "To do" };
const STATUS_MARK: Record<string, string> = { done: "✓", active: "▶", todo: "" };

// Deadline countdown text — kept in sync with the dashboard's DeadlineChip.
function deadlineText(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "due today";
  return `due in ${daysLeft}d`;
}

function PhaseBlock({ relPath, ph }: { relPath: string; ph: PhaseTasks }) {
  const k = ph.statusKey;
  return (
    <div className={`phase-block ${k === "done" ? "done" : ""}`}>
      <div className="phase-head">
        <div className={`dot ${k}`}>{STATUS_MARK[k]}</div>
        <div style={{ flex: 1 }}>
          <div className="phase-t">{ph.name}</div>
          <div className="phase-m">
            <span className={`st ${k}`}>{STATUS_LABEL[k]}</span>
            {ph.total > 0 && <span>{ph.doneCount}/{ph.total} done</span>}
          </div>
        </div>
      </div>
      {ph.tasks.length > 0 && (
        <div className="phase-tasks">
          <TaskChecklist relPath={relPath} tasks={ph.tasks} />
        </div>
      )}
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = buildCampaign(slug);
  if (!c) notFound();

  const rt = readRoadmapTasks(c.roadmapAbsPath, c.roadmapRelPath);
  // Same call the dashboard uses → the % here always matches the card.
  const card = campaignToCard(c, rt);
  const p = c.project;
  const vault = process.env.NEXT_PUBLIC_OBSIDIAN_VAULT || "WorkOS";
  const obsidian = c.roadmapRelPath
    ? `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(c.roadmapRelPath)}`
    : undefined;

  const pct = card.pct;
  const progSub = `${card.done} of ${card.total} ${card.unit === "task" ? "tasks" : "phases"} complete`;

  return (
    <>
      <FreshnessProbe />
      <header className="topbar">
        <Link href="/" className="brand">WorkOS Dashboard<span className="brand-dot">.</span></Link>
        <nav aria-label="Breadcrumb" style={{ display: "contents" }}>
          <span className="crumb" aria-hidden="true">›</span>
          <Link href="/" className="back">Projects</Link>
          <span className="crumb" aria-hidden="true">›</span>
          <span className="crumb"><b>{c.name}</b></span>
        </nav>
      </header>

      <main className="detail" id="main">
        <div className="wrap">
          <div className="d-hero imgwrap" style={{ background: `linear-gradient(135deg, ${card.accent}, ${card.accent}aa)` }}>
            <RemoteImage src={card.img} sizes="(max-width:880px) 100vw, 1080px" />
            <span className="cap"><span aria-hidden="true">📷</span> {card.domain} · {card.status ?? (card.isLead ? "most important" : "active")}</span>
          </div>

          <div className="d-grid">
            <div>
              <h1 className="d-title">{c.name}</h1>
              <div className="d-sub">
                {[
                  card.priority ? `P${card.priority}` : null,
                  card.status ?? c.type,
                  card.isLead ? "★ Urgent + Important" : null,
                ].filter(Boolean).join(" · ")}
              </div>

              {p.goal && (
                <div className="why-card">
                  <div className="why-lbl">🎯 The goal</div>
                  <div className="why-txt">{p.goal}</div>
                </div>
              )}

              <h3 className="sec-h">Roadmap{rt && rt.total ? ` · ${rt.done}/${rt.total} tasks` : ""}</h3>
              <div className="write-note">✏️ Ticking a box writes straight back to <code>roadmap.md</code> in your vault (lock-safe).</div>

              {rt && (rt.subProjects?.length || rt.phases.length) ? (
                rt.subProjects?.length ? (
                  rt.subProjects.map((sp, i) => (
                    <div className={`subproject-block ${sp.statusKey === "done" ? "done" : ""}`} key={i}>
                      <div className="subproject-head">
                        <span className="subproject-t">{sp.name}</span>
                        <span className={`st ${sp.statusKey}`}>{STATUS_LABEL[sp.statusKey]}</span>
                        {sp.total > 0 && <span className="subproject-m">{sp.doneCount}/{sp.total} tasks</span>}
                      </div>
                      {sp.phases.map((ph, j) => (
                        <PhaseBlock relPath={rt.relPath} ph={ph} key={j} />
                      ))}
                    </div>
                  ))
                ) : (
                  rt.phases.map((ph, i) => <PhaseBlock relPath={rt.relPath} ph={ph} key={i} />)
                )
              ) : (
                <div className="empty"><div className="e">🗺️</div>No <code>roadmap.md</code> phases found for this project.</div>
              )}
            </div>

            <div className="d-right">
              <div className="d-card">
                <div className="d-pct" style={{ color: card.accent }}>{pct}%</div>
                <div className="d-pct-sub">{progSub}</div>
                <div className="bar"><i style={{ width: `${pct}%`, background: card.accent }} /></div>
              </div>

              <div className="d-card">
                {p.hardDeadline && (
                  <div className="meta-row">
                    <span>Deadline</span>
                    <b>
                      {card.daysLeft != null && (
                        <span className="deadline-line">
                          <span className={`deadline-chip${card.daysLeft <= 0 ? " overdue" : ""}`}>
                            <span aria-hidden="true">⏳</span> {deadlineText(card.daysLeft)}
                          </span>
                        </span>
                      )}
                      {p.hardDeadline}
                    </b>
                  </div>
                )}
                {p.currentPhase && <div className="meta-row"><span>Current phase</span><b>{p.currentPhase}</b></div>}
                {c.lastSessionDate && <div className="meta-row"><span>Last session</span><b>{c.lastSessionDate}</b></div>}
                {c.sessionCount > 0 && <div className="meta-row"><span>Sessions</span><b>{c.sessionCount}</b></div>}
                {p.techStack && <div className="meta-row"><span>Stack</span><b>{p.techStack}</b></div>}
                {!p.hardDeadline && !p.currentPhase && !c.lastSessionDate && !p.techStack && (
                  <div className="mini-m">No metadata in the project&rsquo;s CLAUDE.md yet.</div>
                )}
              </div>

              {obsidian && <a className="jump" href={obsidian}>↗ Open roadmap in Obsidian</a>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
