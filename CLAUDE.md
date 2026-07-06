# CLAUDE.md — WorkOS Dashboard

Guidance for Claude / AI agents working in this repository. Read this before editing.

## What this project is

A **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4** dashboard that reads a
PARA‑structured markdown vault (the "WorkOS" execution layer of LifeOS) and renders *what to work
on now*. It also **writes back** into that vault when the user ticks a checkbox. The vault is the
single source of truth — there is **no database**.

Product name: **WorkOS Dashboard**. The vault is a vendor-neutral **standard** (see the vault's own
`CLAUDE.md` → "WorkOS standard"); this app is just one *consumer* of it — it reads the markdown and
transforms it into a view, and never writes app-specific concepts back into the vault.

## How to run

```bash
npm install
npm run dev        # http://localhost:3001  (note: port 3001, not 3000)
npm run build      # production build
npm run start      # serve production on :3001
```

There is **no test suite, linter script, or typecheck script** wired into `package.json`. To
type‑check, run `npx tsc --noEmit`. Verify changes by running the dev server against a real or
sample vault (`WORKOS_PATH`).

## Architecture in one breath

`scan` (read vault) → `RealmModel` → `view` (`DashView`, serializable) → React. Writes go through
`/api/todo/toggle` → `anchors` + `lock` + `writer` + `sidecar`. A cheap `/api/realm/version`
(mtime fingerprint) lets the client revalidate when the vault changes.

- **`lib/workos/`** is the engine. `paths.ts` (root + containment), `reader.ts`/`writer.ts`
  (safe read / atomic CAS write), `lock.ts` (advisory lease lock), `anchors.ts` (content‑based
  line resolution), `sidecar.ts` (app‑local journal), `scan.ts` (vault → model),
  `version.ts` (cheap freshness fingerprint), `parsers/*` (markdown → typed fields),
  `types.ts` (the model).
- **`lib/view.ts`** maps the model into the small `DashView` the client renders.
- **`app/`** is thin: server components scan + map, client components render.

## Non‑negotiable invariants

1. **Never touch disk outside the vault.** Every read/write path must go through
   `assertInsideVault()` / `resolveInVault()`. Do not bypass the guard.
2. **Writes are CAS + atomic + locked.** Use `withVaultLock()` around a tiny read→edit→write,
   `writeVaultLinesCAS()` (or `atomicWrite`/`appendToVaultFile`) — never a bare `fs.writeFileSync`
   into the vault. Keep the locked section short; never hold the lock across an async round‑trip.
3. **Resolve edit targets by anchor, not line number.** Render‑time line numbers go stale when
   Obsidian or an agent edits the file. Use `findTodoLine` / `findPhaseStatusLine`; an ambiguous
   match is a *conflict*, not a guess.
4. **App bookkeeping stays off the synced vault.** The write journal / markers live in the sidecar
   (`WORKOS_DATA_PATH`, default `<app>/.workos-data`), never inside the Drive‑synced vault.
5. **Pages are `force-dynamic`.** The vault is read live per request; don't introduce static
   caching of vault reads. The client re‑pulls via `router.refresh()` after a write and when
   `/api/realm/version` reports a change.

## The domain metaphor (so names make sense)

| Code term | Means | Vault location |
| --- | --- | --- |
| campaign | project | `01_Projects/<slug>/` (flat — the `_active/` split was removed 2026-06-30) |
| province | area | `02_Areas/<slug>/` |
| realm | the whole vault | root |
| boss / adversary | a goal or a dated deadline | derived |
| Great Siege | the nearest dated deadline | derived |
| front / domain | one of 5 life areas: career · invest · health · learning · personal | `domains.ts` |
| march | a roadmap phase | `roadmap.md` |
| order / quest | a todo item | `todos.md` |

## Vault file conventions (what the parsers expect)

- `roadmap.md`: `# Roadmap: <t>`, then either flat `## Phase N — …` **or** the hierarchy
  `## Sub-Project N — …` › `### Phase N — …` (auto-detected when any `## Sub-Project` heading is
  present); `Goal:`/`Target: <date>`/`Status: …`, `- [ ]` tasks.
- project `CLAUDE.md`: `## Goal`, `## Hard Deadline`, `## Current Phase`, `## Tech Stack`,
  `## Eisenhower` (the priority contract — `Priority: P1`–`P5` · `Urgent: yes|no` · `Important: yes|no`
  · `Status: active|parked|someday|closing-out|done`). `## Project Type` is now free prose (the
  retired `LEAD`/`someday` markers moved into the Eisenhower block).
- `todos.md`: `## Section`, `- [ ] quest (added YYYY-MM-DD)`, plain bullets = notes.
- `goals.md`: `Label: start → current → target unit by <date>`.
- `habits.md`: `- [domain] Label · <cadence> · Nxp`; cadence ∈ `daily` | `Nx/week` |
  `weekly[:Day]` | `onDays:Mon,Wed,Fri`. Completions appended to `habits-log.md`.
- Parsers degrade gracefully: an unparseable line is skipped, never thrown.

## Naming — neutral standard (de-Sovereigned 2026-06-24)

The predecessor "Sovereign" app is retired. All identifiers are now neutral so the vault is a
vendor-agnostic standard any consumer can read:

- Preference **cookies** (read server-side so the first paint matches — no hydration flash):
  `workos.cardStyle`, `workos.featured`. (The old `workos.dashboard.settings` / `settings.ts` were removed.)
- Sidecar dir `.workos-data` and env var `WORKOS_DATA_PATH`.
- Cross-writer lock files `*.workos.lock` (defined by the WorkOS standard) and journal
  `owner: "workos-dashboard"`.

The lock filename is a **shared coordination contract**: any other writer (an AI agent editing the
vault, a future app) must use the same `*.workos.lock` name to mutually exclude. Don't rename it
without updating every consumer at once.

## Gotchas

- **Shipped routes are only `/` and `/project/[slug]`** (plus `/api/todo/toggle` and
  `/api/realm/version`). The old staged IMPERIVM/HUD engine
  (`derive`/`gamification`/`focus`/`hud`/`search`/`request`/`coredb`/`format`) was **removed
  2026-06-24** — this is a calm reader/writer, not a game. The dead Roman-themed types and the
  unused `log`/`hot` parsers + the orphaned `settings.ts` were also removed, so `types.ts`
  now holds only what the app renders. `GreatSiege` (nearest deadline) is the one such name kept.
  (The `goals` parser was **re-added 2026-07-06** — per-area `goals.md` metrics now render in the
  expandable Area chips, alongside file count + a last-touched staleness badge.)
- **UI patterns.** Images go through `<RemoteImage>` (`next/image` + gradient fallback); fonts via
  `next/font` in `layout.tsx`; a11y baseline = `:focus-visible` ring, keyboard `role="checkbox"`
  rows, and a global `prefers-reduced-motion` reset in `globals.css`.
- **Port 3001**, not the Next default 3000.
- **Windows paths.** `WORKOS_PATH` may contain spaces and backslashes; everything is normalized to
  forward slashes via `paths.ts`. Preserve that.

## Knowledge graph

A graphify knowledge graph of this codebase lives in `graphify-out/` (`graph.html`,
`GRAPH_REPORT.md`, `graph.json`). Rebuild with `/graphify`; query with
`/graphify query "<question>"`. Treat it as the fast map of how modules connect.

## Local dev: run, recover, verify

Full runbook: **`.claude/skills/dashboard-dev/SKILL.md`**. The essentials:

- **Run:** `npm run dev` → http://localhost:3001 (background). Background dev servers don't
  survive a session ending — check `Get-NetTCPConnection -LocalPort 3001` / curl `/` before
  restarting (a "task stopped" note can fire while the process is still listening).
- **The recurring `Jest worker … exceeding retry limit` error is NOT a test failure.** It's
  Next.js's `jest-worker` compile workers getting killed at each **Claude session boundary** (the
  dev server is a child of Claude's background task; the main listener survives but the worker
  pool dies — confirmed crashing at ~91 MB, so it's not OOM). Symptom: `/` serves 200 but a
  `/project/<slug>` 500s while `tsc` is clean — and it's a `500`, not a `404` (a 404 = the project
  was renamed/archived; check `ls 01_Projects/_active/`). **Fix:** stop the server + child workers,
  `rm -rf .next`, `npm run dev`, verify `/` and a `/project/<slug>` are 200. **Durable fix: run
  `npm run dev` in your own terminal, not via Claude** (a `NODE_OPTIONS` heap bump does NOT help).
- **Verify** (no test/lint/typecheck scripts): `npx tsc --noEmit`; curl routes for 200 (always
  test a project route after a restart — it forces a fresh compile); Chrome MCP for visual.
- **External vault edits are safe.** Reads go through `safeRead` + throw-safe regex parsers
  (a malformed file degrades its section, never 500s); writes use lock + anchor + compare-and-swap
  (409 on conflict, never corruption). Verified 2026-06-28 with a malformed throwaway project —
  all routes stayed 200. Re-run that test if you touch the parse/scan path.

## Aesthetic / product direction

This is a calm **one-page** app: the user iteratively compacts sections (habits → Chrome-style
tab strip, completed tasks → per-phase "Completed (N)" dropdown, areas → chips) so the projects
sit above the fold. When adding or growing UI, prefer tabs / chips / collapsibles over stacked
rows. A VISION.md goals layer (`VisionBand`) was added on top of the original reader.
