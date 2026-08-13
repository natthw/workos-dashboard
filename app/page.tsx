import { cookies } from "next/headers";
import { scanRealm } from "@/lib/workos/scan";
import { toDashView } from "@/lib/view";
import { dailyFigureIndex } from "@/lib/figures";
import { readRoadmapTasks, type RoadmapTasks } from "@/lib/roadmap-tasks";
import { buildBoard } from "@/lib/board";
import Dashboard from "@/components/Dashboard";
import { FreshnessProbe } from "@/components/FreshnessProbe";

// Always read the live vault on each request (never statically cached).
export const dynamic = "force-dynamic";

export default async function Page() {
  // Read the persisted card style / featured project server-side so the first
  // paint already matches the user's choice (no post-hydration flash — UX-10).
  const jar = await cookies();
  const initialStyle = jar.get("workos.cardStyle")?.value === "bold" ? "bold" : "calm";
  const initialFeatured = jar.get("workos.featured")?.value;
  // The figure banner is compact by default so the projects sit above the fold.
  // Opening it (portrait, scene, legacy at full size) is a stored preference —
  // if you want the whole thing every morning, you expand it once.
  const initialBannerOpen = jar.get("workos.bannerOpen")?.value === "1";
  // The blocked-on-you strip rests closed: the count and the oldest age are the
  // signal, and the `how:` lines are one click away when you act on them.
  const initialWaitingOpen = jar.get("workos.waitingOpen")?.value === "1";
  // Which lens the projects column opens on — priority (Eisenhower) or the board.
  const initialLens = jar.get("workos.lens")?.value === "board" ? "board" : "eisenhower";

  const realm = scanRealm();
  const initialFigure = dailyFigureIndex(Date.now());

  const tasksBySlug: Record<string, RoadmapTasks> = {};
  for (const c of realm.campaigns) {
    const rt = readRoadmapTasks(c.roadmapAbsPath, c.roadmapRelPath);
    if (rt) tasksBySlug[c.slug] = rt;
  }

  // Same progress rule everywhere: task counts when the roadmap has checkboxes.
  const view = toDashView(realm, tasksBySlug);
  // Parked/someday projects still contribute to Doing (the WIP cap has to be
  // complete) but not to the Next/Done context columns — see lib/board.ts.
  const board = buildBoard(
    realm,
    tasksBySlug,
    new Set(view.projects.filter((p) => p.parked).map((p) => p.slug)),
  );

  return (
    <>
      <FreshnessProbe />
      <Dashboard
        view={view}
        initialFigure={initialFigure}
        tasksBySlug={tasksBySlug}
        initialStyle={initialStyle}
        initialFeatured={initialFeatured}
        initialBannerOpen={initialBannerOpen}
        initialWaitingOpen={initialWaitingOpen}
        initialLens={initialLens}
        board={board}
      />
    </>
  );
}
