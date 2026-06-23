import { buildCampaign } from "@/lib/workos/scan";
import { campaignToCard } from "@/lib/view";
import { readRoadmapTasks } from "@/lib/roadmap-tasks";
import { TaskChecklist } from "@/components/TaskChecklist";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Img({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="ph" src={src} alt="" />;
}

const STATUS_LABEL: Record<string, string> = { done: "Done", active: "Active", todo: "To do" };
const STATUS_MARK: Record<string, string> = { done: "✓", active: "▶", todo: "" };

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
      <div className="topbar">
        <Link href="/" className="brand">Tracker<span className="dot">.</span></Link>
        <span className="crumb">›</span>
        <Link href="/" className="back">Projects</Link>
        <span className="crumb">›</span>
        <span className="crumb"><b>{c.name}</b></span>
      </div>

      <main className="detail">
        <div className="wrap">
          <div className="d-hero imgwrap" style={{ background: `linear-gradient(135deg, ${card.accent}, ${card.accent}aa)` }}>
            <Img src={card.img} />
            <span className="cap">📷 {card.domain} · {card.parked ? "parked" : card.isLead ? "lead project" : "active"}</span>
          </div>

          <div className="d-grid">
            <div>
              <h1 className="d-title">{c.name}</h1>
              <div className="d-sub">
                {[c.type, card.isLead ? "Lead product" : null, card.parked ? "Parked" : null].filter(Boolean).join(" · ")}
              </div>

              {p.goal && (
                <div className="why-card">
                  <div className="why-lbl">🎯 The goal</div>
                  <div className="why-txt">{p.goal}</div>
                </div>
              )}

              <h3 className="sec-h">Roadmap{rt && rt.total ? ` · ${rt.done}/${rt.total} tasks` : ""}</h3>
              <div className="write-note">✏️ Ticking a box writes straight back to <code>roadmap.md</code> in your vault (lock-safe).</div>

              {rt && rt.phases.length ? (
                rt.phases.map((ph, i) => {
                  const k = ph.statusKey;
                  return (
                    <div className={`phase-block ${k === "done" ? "done" : ""}`} key={i}>
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
                          <TaskChecklist relPath={rt.relPath} tasks={ph.tasks} />
                        </div>
                      )}
                    </div>
                  );
                })
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
                {p.hardDeadline && <div className="meta-row"><span>Deadline</span><b>{p.hardDeadline}{card.daysLeft != null ? ` (${card.daysLeft}d)` : ""}</b></div>}
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
