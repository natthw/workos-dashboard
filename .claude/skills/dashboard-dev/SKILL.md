---
name: dashboard-dev
description: Runbook for running, recovering, and verifying the WorkOS Dashboard (Next.js app at C:\AI_Tools\workos-dashboard that reads/writes a PARA markdown vault). Use when starting or restarting its dev server, fixing the recurring "Jest worker encountered N child process exceptions, exceeding retry limit" crash, a project page returning 500, verifying UI changes, editing the WorkOS vault, or building its Now/Habits/Tasks/Areas/Vision UI. Triggers — "run the dashboard", "start the server", "Jest worker exceeding retry limit", "project page 500", "verify the dashboard", "workos dashboard".
---

# WorkOS Dashboard — dev runbook

Operational layer for the Next.js 15 dashboard at `C:\AI_Tools\workos-dashboard`
(reads a PARA markdown vault at `WORKOS_PATH`, writes back only on checkbox toggle).
Read that folder's `CLAUDE.md` first for architecture; this skill is run / recover / verify.

## Run

- `npm run dev` → **http://localhost:3001** (port 3001, NOT the Next default 3000). Next
  auto-loads `.env.local` (`WORKOS_PATH`, `WORKOS_DATA_PATH`, `NEXT_PUBLIC_OBSIDIAN_VAULT`).
- Run it in the background. **Background dev servers do NOT survive a session ending.** Next
  session, re-check before assuming it's down — a "task stopped" notification can fire while
  the OS process is still listening (the tracker lost the handle at the session boundary):
  `Get-NetTCPConnection -LocalPort 3001 -State Listen` or curl `/` first.

## Recover — "Jest worker encountered N child process exceptions, exceeding retry limit"

This is **NOT a test failure.** Next.js dev uses the bundled `jest-worker` package for its
compile workers. **Root cause (confirmed 2026-06-28): the dev server is a child of Claude's
background task, so each Claude _session boundary_ kills its compile-worker subprocesses while
the main `next dev` listener survives** — the server then limps: **cached routes serve 200, but
anything that needs the worker pool 500s** with this message (even an already-compiled
`/project/<slug>` — the single dynamic route still hits a worker on some requests). It is NOT
memory pressure — seen crashing at ~91 MB; it correlates with the "task stopped" session-boundary
notifications, not uptime. `npx tsc --noEmit` is clean — a worker crash, not a code bug.

**First distinguish the status code — don't restart for a 404.** A `500` (Jest-worker message)
= worker crash → the fix below. A `404` means the project folder doesn't exist under that slug:
it was **renamed / archived** in the vault (an external edit — e.g. `Thai_Portfolio_Tracker` →
`Portfolio_Management_System` on 2026-06-28), NOT a crash. Check `ls 01_Projects/_active/` for the
current slug and use that URL; the dashboard already re-links renamed projects. When probing in
PowerShell, read `$_.Exception.Response.StatusCode` so 404 and 500 don't get lumped together.

Fix (this exact sequence has worked every time it has happened):
1. Stop the server **and its child workers** — kill the PID listening on 3001 + its children.
2. `Remove-Item -Recurse -Force .next` — clear the build cache.
3. `npm run dev` again (background).
4. Verify **both** `/` AND a `/project/<slug>` return 200 — the project route forces a fresh
   compile, which is the real "is the worker pool healthy again" check.

Stop + clear, in one PowerShell block:
```powershell
$ids=@((Get-NetTCPConnection -LocalPort 3001 -State Listen -EA SilentlyContinue).OwningProcess|Select-Object -Unique)
foreach($id in $ids){Get-CimInstance Win32_Process -Filter "ParentProcessId=$id" -EA SilentlyContinue|%{Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue};Stop-Process -Id $id -Force -EA SilentlyContinue}
Remove-Item -Recurse -Force 'C:\AI_Tools\workos-dashboard\.next' -EA SilentlyContinue
```

**Durable fix: run `npm run dev` in the user's OWN terminal, independent of Claude** — then a
Claude session boundary can't kill its workers and the crash stops recurring. A
`NODE_OPTIONS=--max-old-space-size` heap bump does NOT help — it isn't OOM. (As long as Claude
backgrounds the server itself, expect to re-run this recover sequence ~once per session boundary.)

## Verify (there are no test / lint / typecheck scripts in package.json)

- **Types:** `npx tsc --noEmit` (exit 0 = clean).
- **Routes:** curl each — `Invoke-WebRequest http://localhost:3001/<path>` — expect 200.
  Always test a `/project/<slug>` after a restart (it forces a fresh compile).
- **Visual:** Chrome MCP (`mcp__Claude_in_Chrome__*`) — navigate + screenshot, and use
  `javascript_tool` to read computed styles / element rects PRECISELY instead of guessing
  pixel coordinates for zoom/click. The Chrome/preview MCP can disconnect mid-session.

## PowerShell gotchas on this box
- `$HOME` is read-only — name web-response vars `$page` / `$h`, never `$home`.
- Windows PowerShell 5.1: no `&&` / `||` — use `;` and `if ($?)`.

## External vault edits are SAFE — the app degrades gracefully (verified 2026-06-28)

The vault at `WORKOS_PATH` is the single source of truth; the app reads it live
(`force-dynamic`). An external edit (Obsidian, Google Drive sync, another agent) — even a
badly malformed one — **cannot crash the web service:**
- **Reads:** every file goes through `safeRead` (try/catch → null); every parser is regex /
  `Number()` based and skips unparseable lines, never throws. A malformed file just empties
  that section. Invalid YAML frontmatter is caught too (gray-matter throws → `safeRead` → null).
- **Writes:** `/api/todo/toggle` re-reads fresh and resolves the target by ANCHOR (raw text),
  under an advisory lock, with a compare-and-swap write — a concurrent external edit yields a
  409/423 conflict (client reverts optimistically), never corruption.
- `FreshnessProbe` polls `/api/realm/version` (mtime fingerprint) and refreshes on change.

Proven by dropping a maximally-malformed throwaway project (`_zz_*` with invalid YAML, broken
checkboxes, bad dates, mode-switching headings, code fences) into `01_Projects/_active/` — every
route stayed 200, then it was deleted. Re-run that test the same way if you change the parse path.

Editing the vault as an agent: the Edit tool is fine for a one-off content edit while the app
is idle (the `*.workos.lock` contract coordinates concurrent *app* writes). Match the file's
existing markdown style; convert relative dates to absolute.

## UI: it is a calm ONE-PAGE app — keep sections compact

Home is a thin `Dashboard.tsx` client shell composing extracted client components: `NowTicker`
(sticky slow marquee at the very top), `HabitsReminder` (Chrome-style tab strip — tabs collapse
to one row, click opens a connected detail panel), `VisionBand`, `TaskChecklist` (per phase;
completed tasks collapse into a "Completed (N)" dropdown so each phase/sub-project keeps its OWN
history — never a project-wide pile), and area chips. The user's standing goal is to fit
everything above the fold — when adding or growing a section, prefer tabs / chips / collapsibles
over stacked rows.

CSS patterns that fit this codebase:
- **Accordion / reveal:** a wrapper `grid-template-rows: 0fr → 1fr` over an
  `overflow:hidden; min-height:0` inner (smooth height animation; add a reduced-motion
  `transition:none`).
- **Chrome-tab → panel join:** active tab `margin-bottom:-1px` + paper background bridges over
  the tab strip's bottom border into a `border-top:none` panel.
- **Watch generic class names:** the brand `.dot` once silently inherited the phase-status
  `.dot` (a 26px circle) and broke the topbar — scope or rename generic class names.
- **Hydration:** a browser extension injects `id="dummybodyid"` on `<body>`; `layout.tsx` keeps
  `suppressHydrationWarning` on `<body>` to silence it (external, not an app bug).

## graphify (knowledge graph in graphify-out/)

After meaningful code changes, update the graph with the `--update` flow (see the global
`graphify` skill). Windows gotchas learned here:
- Wrap graphify's `extract()` — any multiprocessing call — in `if __name__ == "__main__":`,
  or the spawn workers re-import the script and recurse-crash.
- Run python via the saved interpreter: `& (Get-Content graphify-out\.graphify_python)`.
- `to_json(..., force=True)` allows an intentional shrink (you deleted source files).
- `.css` files are not tracked by graphify; `globals.css` changes won't show in the graph.
