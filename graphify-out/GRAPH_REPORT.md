# Graph Report - C:/AI_Tools/workos-dashboard  (2026-06-26)

## Corpus Check
- Corpus is ~17,358 words - fits in a single context window. You may not need a graph.

## Summary
- 314 nodes · 509 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.83)
- Token cost: 62,421 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Vault Markdown Parsers|Vault Markdown Parsers]]
- [[_COMMUNITY_Dashboard UI Components|Dashboard UI Components]]
- [[_COMMUNITY_Architecture & Design Notes|Architecture & Design Notes]]
- [[_COMMUNITY_Vault Paths & Safe Read|Vault Paths & Safe Read]]
- [[_COMMUNITY_View Model & Mapping|View Model & Mapping]]
- [[_COMMUNITY_Engine Invariants & API|Engine Invariants & API]]
- [[_COMMUNITY_Vault Scan & Roadmap|Vault Scan & Roadmap]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Advisory Vault Lock|Advisory Vault Lock]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Content Anchor Resolution|Content Anchor Resolution]]
- [[_COMMUNITY_Domain Metaphor|Domain Metaphor]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Roadmap Convention|Roadmap Convention]]
- [[_COMMUNITY_Habits File Convention|Habits File Convention]]
- [[_COMMUNITY_Project Header Convention|Project Header Convention]]
- [[_COMMUNITY_Todos File Convention|Todos File Convention]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `assertInsideVault()` - 15 edges
3. `buildCampaign()` - 9 edges
4. `toRel()` - 8 edges
5. `readVaultFile()` - 8 edges
6. `scanRealm()` - 8 edges
7. `Dashboard.tsx (client dashboard component)` - 8 edges
8. `readRoadmapTasks()` - 7 edges
9. `/api/todo/toggle (lock-safe checkbox write-back)` - 7 edges
10. `app/globals.css (design system + tokens)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `TaskChecklist.tsx (optimistic toggle checklist)` --calls--> `/api/todo/toggle (lock-safe checkbox write-back)`  [INFERRED]
  README.md → CLAUDE.md
- `UX-17 next/image + remote patterns for imagery` --semantically_similar_to--> `RemoteImage (next/image + gradient fallback)`  [INFERRED] [semantically similar]
  documents/requirements/ux-ui-improvements.md → CLAUDE.md
- `GET()` --calls--> `vaultVersion()`  [EXTRACTED]
  app/api/realm/version/route.ts → lib/workos/version.ts
- `POST()` --calls--> `withVaultLock()`  [EXTRACTED]
  app/api/todo/toggle/route.ts → lib/workos/lock.ts
- `Page()` --calls--> `scanRealm()`  [EXTRACTED]
  app/page.tsx → lib/workos/scan.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Defensive vault write-back pipeline (toggle to disk)** — claude_api_todo_toggle, claude_anchors, claude_lock, claude_writer, claude_sidecar [EXTRACTED 1.00]
- **Scan to render data flow (vault to React)** — claude_scan, claude_realmmodel, claude_view_todashview, claude_dashview, readme_dashboard_component [EXTRACTED 1.00]
- **Sprint 1 accessibility/quality quick wins** — uxuiimprovements_ux01_keyboard_checkboxes, uxuiimprovements_ux02_focus_indicators, uxuiimprovements_ux03_reduce_motion, uxuiimprovements_ux04_ink_faint_contrast, uxuiimprovements_ux16_next_font [EXTRACTED 1.00]

## Communities (19 total, 6 thin omitted)

### Community 0 - "Vault Markdown Parsers"
Cohesion: 0.06
Nodes (42): parseHabitLog(), parseCadence(), parseHabitLine(), parseHabits(), parseNow(), detectLead(), isParked(), parseProject() (+34 more)

### Community 1 - "Dashboard UI Components"
Cohesion: 0.07
Nodes (28): NotFound(), Page(), Crown(), CardStyle, Dashboard(), pickActivePhase(), FreshnessProbe(), NowTicker() (+20 more)

### Community 2 - "Architecture & Design Notes"
Cohesion: 0.07
Nodes (32): DashView (serializable client view), De-Sovereign neutral-naming refactor (2026-06-24), RealmModel (typed vault model), RemoteImage (next/image + gradient fallback), types.ts (shared data model), lib/view.ts toDashView (model to DashView), Crown.tsx / crown most-important mechanic, Dashboard.tsx (client dashboard component) (+24 more)

### Community 3 - "Vault Paths & Safe Read"
Cohesion: 0.15
Nodes (24): assertInsideVault(), getVaultRoot(), isInsideVault(), RAW_ROOT, resolveInVault(), toRel(), fileExists(), ReadResult (+16 more)

### Community 4 - "View Model & Mapping"
Cohesion: 0.10
Nodes (23): HabitsReminder(), AreaView, campaignToCard(), DAYS, daysUntilISO(), DOMAIN_ACCENT, DOMAIN_IMG, HabitView (+15 more)

### Community 5 - "Engine Invariants & API"
Cohesion: 0.10
Nodes (26): Resolve edit targets by anchor, not line number (invariant), anchors.ts (content-based line resolution), /api/realm/version (mtime fingerprint endpoint), /api/todo/toggle (lock-safe checkbox write-back), assertInsideVault / resolveInVault (containment guard), CAS + atomic + locked writes (invariant), findTodoLine / findPhaseStatusLine (anchor resolution), Pages are force-dynamic (live vault reads) (+18 more)

### Community 6 - "Vault Scan & Roadmap"
Cohesion: 0.18
Nodes (19): parseRoadmap(), phaseProgress(), GET(), DIRS, PARA, ROOT_FILES, buildCampaign(), buildProvince() (+11 more)

### Community 7 - "Package Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, gray-matter, next, react, react-dom, description, devDependencies, postcss (+13 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Advisory Vault Lock"
Cohesion: 0.27
Nodes (9): POST(), isStale(), Lease, lockPathFor(), readLease(), sleep(), tryAcquire(), VaultBusyError (+1 more)

### Community 10 - "Root Layout & Fonts"
Cohesion: 0.40
Nodes (3): dmSans, metadata, spectral

### Community 11 - "Content Anchor Resolution"
Cohesion: 0.83
Nodes (3): findPhaseStatusLine(), findTodoLine(), normalize()

### Community 12 - "Domain Metaphor"
Cohesion: 0.67
Nodes (3): Domain metaphor (campaign/province/realm/march/quest), domains.ts (five life fronts), GreatSiege (nearest dated deadline)

## Knowledge Gaps
- **88 isolated node(s):** `Figure`, `DOMAIN_ORDER`, `DOMAIN_META`, `NAME_TABLE`, `KEYWORDS` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toRel()` connect `Vault Paths & Safe Read` to `Vault Scan & Roadmap`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `readVaultFile()` connect `Vault Paths & Safe Read` to `Dashboard UI Components`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `resolveInVault()` connect `Vault Paths & Safe Read` to `Vault Scan & Roadmap`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `Figure`, `DOMAIN_ORDER`, `DOMAIN_META` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault Markdown Parsers` be split into smaller, more focused modules?**
  _Cohesion score 0.06108597285067873 - nodes in this community are weakly interconnected._
- **Should `Dashboard UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06547619047619048 - nodes in this community are weakly interconnected._
- **Should `Architecture & Design Notes` be split into smaller, more focused modules?**
  _Cohesion score 0.07258064516129033 - nodes in this community are weakly interconnected._