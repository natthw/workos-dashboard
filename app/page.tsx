import { scanRealm } from "@/lib/workos/scan";
import { toDashView } from "@/lib/view";
import { dailyFigureIndex } from "@/lib/figures";
import { readRoadmapTasks, type RoadmapTasks } from "@/lib/roadmap-tasks";
import Dashboard from "@/components/Dashboard";

// Always read the live vault on each request (never statically cached).
export const dynamic = "force-dynamic";

export default function Page() {
  const realm = scanRealm();
  const initialFigure = dailyFigureIndex(Date.now());

  const tasksBySlug: Record<string, RoadmapTasks> = {};
  for (const c of realm.campaigns) {
    const rt = readRoadmapTasks(c.roadmapAbsPath, c.roadmapRelPath);
    if (rt) tasksBySlug[c.slug] = rt;
  }

  // Same progress rule everywhere: task counts when the roadmap has checkboxes.
  const view = toDashView(realm, tasksBySlug);

  return <Dashboard view={view} initialFigure={initialFigure} tasksBySlug={tasksBySlug} />;
}
