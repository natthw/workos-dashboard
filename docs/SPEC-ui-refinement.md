# SPEC — WorkOS Dashboard UI refinement (round 2)

**Status:** ready to execute · **Written:** 2026-08-08 · **Method:** Spec-Driven Development (Requirements → Design → Tasks)

This document is **self-contained**. A fresh session should be able to execute it without reading the
conversation that produced it. Everything below is either a measured fact (dated), a decision the
owner made explicitly (locked), or a derived requirement.

---

## 0. How to use this document

1. Read §1 (state), §2 (locked decisions), §3 (requirements).
2. Execute §5 tasks **in order**. Each task names its verification.
3. Use §6 (verification methodology) — it encodes two measurement mistakes that were made in the
   previous round and must not be repeated.
4. §7 lists environment failures you will probably hit. They are not product bugs.
5. When done, re-run `/impeccable critique` against `components/Dashboard.tsx` to get a comparable
   score (see §1 for the trend).

**Scope discipline:** this is **refinement, not redesign** (locked — see §2.1). Keep the incumbent
visual world, the palette, the banner, the card design, and all copy that comes from the vault.
Change *order, compaction, and defects only*.

---

## 1. Current state (measured 2026-08-08, dev server, Chrome)

### Score trend
| Run | Score | Notes |
|---|---|---|
| 2026-08-06 | 22/40 | baseline, before any work |
| 2026-08-08 | **24/40** | after harden + clarify + distill + audit + polish |

Snapshots: `.impeccable/critique/*__components-dashboard-tsx.md`. Read the **latest** for full findings.

### Geometry baseline — this is what the work must move

| Metric | Desktop 1280×800 | Mobile 375×812 |
|---|---|---|
| Banner (collapsed) | 130 px | 213 px |
| Banner (expanded, cookie `workos.bannerOpen=1`) | 221 px | 465 px |
| Vision band `.vision` | 239 px | 459 px |
| **First project card y-offset** | **473–524 px** | **1661 px** |
| Document height | 1293 px | 3026 px (3.7 screens) |
| Habit panel open → pushes work down | +159 px | — |
| Banner expand → pushes work down | +91 px | +253 px |

### Other measured facts
- **Detector:** 6 findings, all `app/globals.css`, **zero in any `.tsx`**. Stable across 5 passes.
  4 of 6 are agreed false positives (see §8.2).
- **Touch targets:** 0 under 44×44 across 45 controls. ✅ do not regress.
- **Typography drift:** 12 distinct font sizes, 10 distinct border radii, 16 text colours.
- **Infinite animations:** 3 — `nowpulse` 2s, `nowscroll` 44s, `crownbob` 3s.
- **Console:** 0 errors on clean load. No horizontal overflow at 375px.
- **Heading outline (home):** `h1.vh` → `h2 Projects` → `h2 Areas`. **Only 3.**

---

## 2. Locked decisions — do not relitigate

These came from the owner directly. Treat as constraints, not preferences.

### 2.1 Refinement, not redesign
Chosen 2026-08-08 over "push the vault aesthetic further" and "rethink the home surface".
**Therefore out of bounds:** markdown-source checklists, replacing the project photography,
collapsing to a single-project home, changing the palette, restyling the cards.

### 2.2 The figure banner keeps all four facts
Person · quote · legacy · info. It may be compacted or recomposed; it may never carry fewer facts.
**The banner photography is content, not decoration** — owner, 2026-08-08:
> "The photo is the legacy of the person's quote which can give me knowledge about what their legacy more."

Do **not** replace the portrait or scene backdrop with an abstract/gradient treatment.

### 2.3 The cream/ink palette encodes past → future, and does NOT belong in the banner
Owner, 2026-08-08:
> "The ink palette is about my own life which I think should be placed somewhere else not the banner."

The banner is someone else's life. Candidate homes are surfaces that are *his*: the Vision band
(`VISION.md`, annual horizon) or per-area goals — both already store `start → current → target`,
the same past→future shape. **Still unplaced.** Do not force it during this round; it needs its own
decision. Note `.vision` already carries a `life-journey.png` backdrop under a cream wash.

### 2.4 Chosen direction for this round: **invert the page**
Chosen 2026-08-08 over a11y-only, data-surfacing-only, and P0-only.
Rationale accepted: heuristics 6, 7 and 8 are all downstream of "how far is the work from the top."

### 2.5 Deliberately unresolved
- **No dark mode.** 0 uses of `prefers-color-scheme`. The light paper world is a committed choice.
  Adding dark mode is a separate decision, not a defect to patch.
- **Palette placement** (§2.3).

---

## 3. Requirements

Format: `REQ-n` · rationale · **AC** = acceptance criteria (must be objectively verifiable).

### REQ-1 — Work appears above the fold on both viewports
**Rationale:** stated product direction is a calm *one-page* app whose job is "what to work on now."
Currently 57% of the first desktop screen and 2.0 viewport-heights on mobile precede the first project.

**AC-1.1** First project card `y ≤ 360 px` at 1280×800, banner collapsed (from 473–524).

**AC-1.2** At 375×812, banner collapsed, the **first actionable task checkbox** (`.todo-row` inside
`aside.focus`) is at `y ≤ 700 px` — i.e. within the first viewport-height.
> *Why this metric and not "first project card":* on mobile `.split` stacks to one column, so the
> focus panel (~776 px) necessarily precedes the projects grid. Even with Vision moved below, the
> first *card* lands around y≈1090. Requiring ≤700 for the card would be unachievable without also
> gutting the focus panel — which is out of scope. The focus panel's checklist **is** the work, so
> the first checkbox is the honest "work above the fold" test on mobile.

**AC-1.3** First project card `y ≤ 1200 px` at 375×812, banner collapsed (from 1661).
**AC-1.4** Document height at 375×812 `≤ 2400 px` (from 3026).
**AC-1.5** Expanding the banner or opening a habit panel does **not** move the Projects grid by more
than 8 px.
**AC-1.6** No content is deleted — Vision, habits, areas and stats all remain reachable on the page.

### REQ-2 — The "Now" statement is complete, readable, and pausable
**Rationale:** P0. It is the most visually dominant element and is currently truncated mid-sentence
("…The rule:"), 41% visible on mobile, and unpausable by touch (WCAG 2.2.2 fail).

**AC-2.1** The rendered text is not cut at the first newline — a multi-line `NOW.md` focus block
renders its full first *sentence group*, not `split("\n")[0]`.
**AC-2.2** At 375×812 the full statement is readable without motion (no horizontal marquee, or a
visible pause control that is keyboard-focusable and ≥44×44).
**AC-2.3** If any motion remains, `.now-ticker` contains ≥1 focusable descendant so `:focus-within`
can fire.
**AC-2.4** Reduced-motion behaviour is preserved (already handled — do not regress).

### REQ-3 — Non-text contrast meets WCAG 1.4.11 / 2.4.11
**Rationale:** the previous audit measured text pairs only and missed both of these.

**AC-3.1** Unchecked checkbox `.box` border ≥ **3:1** against `--paper`. (Currently **1.28:1**.)
**AC-3.2** `:focus-visible` ring ≥ **3:1** against **both** `--paper` and `--bg`.
(Currently 3.12:1 / **2.87:1**.)
**AC-3.3** Progress-bar track (`.bar`) ≥ 3:1 against its container.

### REQ-4 — Text over the Vision band image meets WCAG 1.4.3
**Rationale:** `.vision` is painted with `life-journey.png` under a cream gradient. Five elements fail
when measured against the *actual* backdrop; the previous audit measured against the nearest opaque
ancestor and wrongly passed them.

Current worst ratios: `.vision-active` **1.85**, `.ht-star` **3.87**, `.vtile-sub` **4.19**,
`.vtile-caret` **4.28**, `.ht-lead` **4.46**. Backdrop luminance spans a **3.9:1 range** within the
one surface.

**AC-4.1** Every text element inside `.vision` measures ≥ **4.5:1** against the composited backdrop
at its **worst** sample point (see §6.2 for the required method).
**AC-4.2** The fix is systemic (raise the overlay floor so the band has a guaranteed minimum
luminance), **not** per-element colour chasing — the image can change.

### REQ-5 — A tick on the home panel is reversible in place
**Rationale:** `TaskChecklist.tsx:183` gates the Completed fold on `limit == null`;
`Dashboard.tsx:300` passes `limit={3}`. Measured `.focus .done-toggle` = 0. A mis-tap on a phone
writes to a Drive-synced file with no in-place recovery.

**AC-5.1** With `limit` set and ≥1 completed task, a Completed disclosure renders in the focus panel.
**AC-5.2** Un-ticking from that disclosure restores the original file state (verify via the write
receipt path + line).
**AC-5.3** The open-task limit still applies (the panel does not become a full roadmap).

### REQ-6 — Regions are reachable by heading navigation
**Rationale:** heading nav currently offers 2 landmarks; the panel containing today's tasks has none.

**AC-6.1** Each major region has a heading: Most-important panel, Vision, Daily habits,
Someday/parked. Visually-hidden (`.vh`) is acceptable where a visible heading would harm the design.
**AC-6.2** No skipped levels; exactly one `h1` per route.
**AC-6.3** `h2 Areas` is not nested inside the container that `h2 Projects` heads (fix the DOM
containment lie).

### REQ-7 — Sibling disclosures behave consistently
**Rationale:** the Vision dial floats on a zero-height anchor (deliberate, documented at
`globals.css:486`); the habit panel 30px away pushes content 159px. The popover also fully occludes
the habit strip while those tabs stay focusable underneath.

**AC-7.1** Opening a habit panel moves the Projects grid by ≤8 px.
**AC-7.2** With a Vision dial open, no focusable control is fully covered by the popover.

### REQ-8 — No regressions
**AC-8.1** Detector findings ≤6, and **zero in any `.tsx`**.
**AC-8.2** 0 touch targets under 44×44.
**AC-8.3** 0 console errors; no horizontal overflow at 375px on either route.
**AC-8.4** `npx tsc --noEmit` clean (use `node_modules/.bin/tsc` if npx misbehaves — see §7.3).
**AC-8.5** The write path still works: tick → receipt with correct path+line → untick → vault byte-identical.

---

## 4. Design

### 4.1 REQ-1 — page inversion

Current order in `components/Dashboard.tsx`:

```
:210  <NowTicker>
:212  <div className="banner banner-hero">      (topbar + figure)
:263  <main id="main">
:266    <VisionBand>  <HabitsReminder/>  </VisionBand>     ← 239px desktop / 459px mobile
:277    <div className="split">  focus panel | projects grid
:343    Areas
:412    stat-row
```

Target order:

```
      <NowTicker>                       (compacted per REQ-2)
      <div className="banner banner-hero">
      <main id="main">
        <div className="split">  focus panel | projects grid     ← moves UP
        Areas
        <VisionBand>  <HabitsReminder/>  </VisionBand>           ← moves DOWN
        stat-row
```

**Vision rail compaction.** `.vision` must not cost 239/459 px in its resting state. Collapse the
5-dial rail to a single summary strip that expands on click:

- Resting: one line — `Vision 2026 · 5/5 domains active · 41%` + the existing `read the plan ↗`.
- Expanded: the current 5-dial rail.
- Persist with a cookie following the **existing** pattern (`workos.cardStyle`, `workos.featured`,
  `workos.bannerOpen` — read server-side in `app/page.tsx` so first paint matches; see
  `setPrefCookie` in `Dashboard.tsx`).

**Habits.** Currently nested *inside* `VisionBand` as `children` (`Dashboard.tsx:266-268`). That
nests a daily horizon inside an annual one — a grouping error. When Vision moves below the work,
either (a) keep habits with Vision, or (b) promote habits to their own compact strip that stays near
the top (they are a 7am ritual). **Recommend (b)**, but it is a judgement call — the AC only requires
that the work clears the fold.

**Do not** change `.split`, the card grid, or `.focus` internals.

### 4.2 REQ-2 — Now ticker

`components/NowTicker.tsx:15`:
```ts
const text = focus ? truncateWords(focus.split("\n")[0].replace(/\*\*/g, ""), 240) : "";
```
`split("\n")[0]` is the defect. Replace with the full block (newlines → spaces), still stripping `**`
(correct here — the marquee/one-liner is not the place to render emphasis; `components/Prose.tsx`
handles rendering markdown elsewhere).

Then **remove the marquee**: `.now-ticker-track` / `nowscroll` / the two duplicated `.now-ticker-text`
spans in `globals.css`. Render static text clamped to 2 lines (`-webkit-line-clamp:2`) at 14px.
This satisfies AC-2.2 and AC-2.3 by removing the motion entirely, and deletes an infinite animation
from a page whose identity is "calm."

Keep the existing `.vh` full-text span for screen readers, and keep the reduced-motion block coherent
(it currently converts the marquee to static — simplify, don't orphan it).

### 4.3 REQ-3 / REQ-4 — contrast

**REQ-3.** In `app/globals.css`:
- `.box` border `var(--line)` → `var(--ink-faint)` (#7d6a58 = 4.79:1 on paper).
- `:focus-visible` outline `var(--accent)` → `var(--ink)` with a 2px `--paper` offset ring
  (13.5:1 on both grounds). Keep the existing light-on-dark override
  (`.banner :focus-visible` etc. → `#fff`).
- `.bar` track: same treatment as `.box` if it measures <3:1.

**REQ-4.** `.vision` background is:
```css
linear-gradient(rgba(251,246,238,.4), rgba(251,246,238,.74)), url(/life-journey.png)
```
Raise the overlay floor — e.g. `.4 → .70` and `.74 → .88` — then **re-measure** (§6.2) rather than
assuming. This is systemic per AC-4.2. If the band then looks washed out, the correct lever is a
different image or a darker ink for that region — **not** reverting the floor.

Existing AA-safe tokens already in `:root`: `--warn-ink #a63c22`, `--accent-ink #a04a28`,
`--gold-ink #8a6414`. These pass on **paper**; they were not validated against the image band.

### 4.4 REQ-5 — home-panel undo

`components/TaskChecklist.tsx:183`:
```tsx
{limit == null && doneTasks.length > 0 && (   // ← the gate
```
Change to render whenever `doneTasks.length > 0`, and slice done items when `limit` is set
(e.g. `doneTasks.slice(0, limit)`) so the panel does not become a full roadmap (AC-5.3).

Alternative (if the fold crowds the panel): keep the ticked row in place for ~8s with an **Undo** in
its own receipt. `components/WriteReceipt.tsx` already has the `rc-actions` button pattern and the
`onRetry` plumbing to copy.

### 4.5 REQ-6 — headings

Add `.vh` headings (or promote existing labels) for: the Most-important panel (`aside.focus`,
currently `aria-label="Most important project"` — give it a real `h2` and point `aria-labelledby` at
it), Vision (`section.vision` has `aria-label`), Daily habits, Someday/parked.
Fix containment: `h2 Areas` at `Dashboard.tsx:343` currently sits inside the `<div>` headed by
`h2 Projects` — move it to a sibling container.

### 4.6 REQ-7 — disclosure consistency

Apply the `.vision-detail-anchor` pattern (`globals.css:486-492`, zero-height anchor + absolutely
positioned panel) to `.ht-panel`. Read the comment at `:486` first — it documents exactly why the
pattern exists. Ensure the Vision popover and the habit strip do not overlap; if they must,
`inert` or `display:none` the covered controls so they leave the tab order.

---

## 5. Tasks (execute in order)

| # | Task | Covers | Verify with |
|---|---|---|---|
| 1 | Now ticker: full text + remove marquee | REQ-2 | §6.1 geometry, §6.4 reduced-motion, read rendered text |
| 2 | Invert page order; compact Vision rail to a summary strip + cookie | REQ-1 | §6.1 at both viewports, both banner states |
| 3 | Habit panel → zero-height anchor pattern; fix occlusion | REQ-7 | §6.1 push-delta, `elementsFromPoint` |
| 4 | Non-text contrast: `.box`, focus ring, `.bar` | REQ-3 | §6.3 |
| 5 | Vision band overlay floor; re-measure | REQ-4 | §6.2 (mandatory method) |
| 6 | Home-panel Completed fold | REQ-5 | §6.5 write round-trip |
| 7 | Region headings + containment fix | REQ-6 | §6.6 |
| 8 | Regression sweep | REQ-8 | §6.7 |
| 9 | `/impeccable critique` for a comparable score | — | trend vs 22 → 24 |

Tasks 1–3 are the chosen direction (§2.4) and the biggest score lever. Tasks 4–7 are known defects
with fixed answers. Do 1–3 first; if time is short, 4–5 matter more than 6–7 (they are WCAG failures).

---

## 6. Verification methodology

> **Two mistakes were made in the previous round. Both are encoded below. Do not repeat them.**

### 6.1 Geometry
Measure with `getBoundingClientRect()` + `scrollY`, at **1280×800 and 375×812**, in **both** banner
states (cookie `workos.bannerOpen` = `0` and `1`), after a **full reload** — not after a JS toggle.
HMR leaves stale CSS; a toggle-then-measure produced wrong numbers twice last round. Set the cookie,
reload, then measure.

### 6.2 Contrast over an image or gradient — MANDATORY METHOD
**Mistake #1 last round:** walking up to the nearest opaque ancestor and measuring against that.
For `.vision` (painted with `life-journey.png`) this reported *passes* for five elements that
actually **fail**.

Correct method:
1. Draw the backdrop image into a canvas at the element's rendered size, replicating
   `background-size: cover`.
2. Composite the CSS gradient overlay at the element's **y position** (the overlay is vertical:
   `rgba(251,246,238,.4)` → `.74`).
3. Composite each ancestor's own translucent `background-color` (e.g. `.vtile` is
   `rgba(251,246,238,.55)`).
4. Sample **multiple points** across the element box (corners + centre) and take the **worst** ratio.
5. A single centre sample is not sufficient — the backdrop spans a 3.9:1 luminance range.

For text on a **gradient** (e.g. `.now-ticker`), resolve both gradient stops and check both.

### 6.3 Non-text contrast — MANDATORY
**Mistake #2 last round:** only text/background pairs were sampled, so a 2px border and an outline
were never checked.

Also measure, against their adjacent surface, at ≥3:1:
- control **borders** (`.box`, inputs, `.bar` track),
- **focus rings** (against *every* surface they appear on — `--paper` **and** `--bg`),
- any state conveyed by a boundary rather than by text.

### 6.4 Motion
- Enumerate `animation-iteration-count: infinite`.
- For any moving text: confirm a pause mechanism exists that is reachable by **keyboard and touch**
  — `:hover`/`:focus-within` alone fails if the container has 0 focusable descendants (WCAG 2.2.2).
- Confirm `prefers-reduced-motion` blocks still make sense after any motion is removed.

### 6.5 Write path (never skip)
The vault is the owner's real data on Google Drive.
1. Snapshot every `.todo-row` `aria-checked` value first.
2. Tick → assert the receipt shows the correct `path:line` and `[ ] → [x]`.
3. Untick → assert the snapshot string matches **character-for-character**.
Report the exact task touched.

### 6.6 Semantics
- Dump the full `h1..h6` outline for **both** routes.
- For every `[aria-expanded]`, check `aria-controls` **in the expanded state** — this codebase sets it
  conditionally on purpose (pointing at a non-existent node is the defect that was fixed).
  Measuring only the collapsed state produces a false "0 of 15" reading.
- Verify accessible names via direct DOM queries; `read_page`'s interactive tree is incomplete here.

### 6.7 Regression sweep
```bash
node_modules/.bin/tsc --noEmit
node "<impeccable>/scripts/detect.mjs" --json app components lib
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/project/Personal_Finance
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/project/does_not_exist   # expect 404
```
Plus: console errors, horizontal overflow at 375px on both routes, touch-target sweep.

---

## 7. Environment — expect these, they are not product bugs

### 7.1 `jest-worker` / stale `.next` breakage
Symptom: `/` serves 200 but every `/project/*` returns 404 or 500 with
`missing required error components` or `Cannot read properties of undefined (reading 'call')`.
This hit twice during the last round, mid-review, and voided a whole assessment.

Fix (from `.claude/skills/dashboard-dev/SKILL.md`):
```bash
# stop the dev server AND its child workers, then:
rm -rf .next
npm run dev
# verify / , /project/<slug> , and a bogus slug (expect 200, 200, 404)
```
**Always re-verify all three routes before trusting any measurement.** A bogus slug returning 500
instead of 404 is the tell.

### 7.2 Browser pane limitations
- **Screenshots may fail** ("not compositing frames"). Ground every visual claim in measured
  geometry and computed styles instead; say so explicitly rather than inventing impressions.
- **Real keyboard modality is not drivable** — synthesized key events arrive with an empty `key`, and
  `el.focus({focusVisible:true})` does not reliably set `:focus-visible`. Focus-ring conclusions must
  be labelled *CSS-rule-derived, not confirmed on screen*.
- The pane sometimes opens at a **0×0 viewport**. Set explicit `{width:1280,height:800}` and
  re-measure if any dimension reads 0.

### 7.3 `npx tsc` may fail
`npx tsc --noEmit` can hit "This is not the tsc command you are looking for."
Use `node_modules/.bin/tsc --noEmit` instead. Also delete stale generated types
(`.next/types/**`) if tsc complains about a route file you removed.

---

## 8. Known findings NOT in scope

### 8.1 Deferred product gaps (real, but not this round)
- **`doneToday` is computed and discarded.** `lib/view.ts` parses per-habit completion from
  `habits-log.md`, ships it to the client, and **no component reads it**. `.habit-dot.on` is styled
  and unused. The 7am habit strip cannot say whether you did the habit today.
- **`view.now.nextActions` / `waiting`** parsed from `NOW.md`, 0 references.
- **`card.priority` (P1–P5)** reaches the card and is never rendered on the dashboard.
- **No project staleness signal** — Area chips got one, projects did not.
- **Card blurbs show a median 20% of their text** (worst 3%) because `blurb` is the whole `## Goal`
  paragraph. Would need an optional `## Blurb` in the vault contract or first-sentence extraction.
- **Dead CSS:** `.habit`, `.habit-dot`, `.habit-cad`, `.key-chip`, `.mini*` family, `.stripes`.
- **Typography drift:** 12 font sizes, 10 border radii — collapse to ~6 and ~4.

### 8.2 Detector findings — standing dispositions
6 findings, all `app/globals.css`. Agreed classifications (2 independent reviews):
- `.vision-caret` `border-bottom:8px` — **false positive**, it is a zero-size CSS triangle.
- `.vision-detail` `border-top:3px` — **false positive**, neutral `--line`, ties popover to its dial.
- `.subproject-block` `border-left:3px` — **false positive**, hierarchy indent rail, not a card accent.
- `.bar > i` / `.vtile-bar > i` `transition: width` — **genuine but low value**, 6–8px bars animating
  once on mount.
- `.why-card` `border-left:3px solid var(--accent)` — **genuine slop**, textbook side-tab on a
  rounded shadowed card. Fix if touching that file.
- Overlay rule `overused-font` (Arial) — **false positive**, Arial appears only in the UA fallback
  stack on non-rendering nodes. Real: 2 families (DM Sans, Spectral).
- Overlay rule `em-dash-overuse` — **real**, 22 em-dashes ≈ 2.12 per 500 chars.

Consider adding the confirmed false positives to `.impeccable/critique/ignore.md` so they stop
consuming attention each round.

---

## 9. Definition of done

- [ ] All AC in §3 verified by the methods in §6, with measured numbers recorded.
- [ ] REQ-8 regression sweep clean.
- [ ] Vault byte-identical after any write testing (§6.5).
- [ ] `/impeccable critique` re-run; new snapshot in `.impeccable/critique/`; score compared to 24/40.
- [ ] Anything deliberately not done is listed with a reason — not silently dropped.

**Honesty rule for the executing session:** if a check could not be run (environment, tooling), say
so explicitly and label the conclusion as underived. Do not report a method's output as a pass when
the method itself was not applicable — that is precisely how the two contrast mistakes in §6.2/§6.3
reached a "verified" report last round.
