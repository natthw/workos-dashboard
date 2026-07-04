import { cookies } from "next/headers";
import { scanRealm } from "@/lib/workos/scan";
import { toDashView } from "@/lib/view";
import { dailyFigureIndex } from "@/lib/figures";
import { readRoadmapTasks, type RoadmapTasks } from "@/lib/roadmap-tasks";
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

  const realm = scanRealm();
  const initialFigure = dailyFigureIndex(Date.now());

  const tasksBySlug: Record<string, RoadmapTasks> = {};
  for (const c of realm.campaigns) {
    const rt = readRoadmapTasks(c.roadmapAbsPath, c.roadmapRelPath);
    if (rt) tasksBySlug[c.slug] = rt;
  }

  // Same progress rule everywhere: task counts when the roadmap has checkboxes.
  const view = toDashView(realm, tasksBySlug);

  return (
    <>
      <FreshnessProbe />
      <Dashboard
        view={view}
        initialFigure={initialFigure}
        tasksBySlug={tasksBySlug}
        initialStyle={initialStyle}
        initialFeatured={initialFeatured}
      />
    </>
  );
}
