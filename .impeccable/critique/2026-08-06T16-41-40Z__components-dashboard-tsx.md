---
target: WorkOS Dashboard home surface
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-06T16-41-40Z
slug: components-dashboard-tsx
---
Method: dual-agent (A: design review, unanchored · B: detector + measured browser evidence, isolated)

Target: `components/Dashboard.tsx` (home surface, via `app/page.tsx`) + `app/project/[slug]/page.tsx`. Mode: **Operate**.

Evidence caveat: pixel screenshots were unavailable this session — the Browser pane never composited frames. Every visual claim below is grounded in live `getBoundingClientRect()` geometry, computed styles, computed WCAG luminance, accessibility-tree dumps, and injected-overlay console output taken from the running app at 1280×800 and 375×812. Stronger than a screenshot for everything except aesthetic feel.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `FreshnessProbe` polls every 15s and fires `router.refresh()` silently; `view.scannedAt` is computed (`lib/view.ts:370`) and never rendered; the in-flight `busy` guard produces zero feedback |
| 2 | Match System / Real World | 3 | Vocabulary is genuinely the owner's ("Someday / parked", "due in 41d"). But raw `**markdown**` asterisks leak into all 5 project blurbs, and a bare `31d` chip has no real-world referent |
| 3 | User Control and Freedom | 2 | Ticking writes to disk with no undo (a journal exists at `route.ts:70`, no UI for it); pinning silently overwrites behind a 2.6s toast; the red overdue banner cannot be dismissed |
| 4 | Consistency and Standards | 2 | Five different expand idioms on one page; `BoldCard` and `CalmCard` render *different data* (`Dashboard.tsx:98` vs `:115`); 14 distinct font sizes and 17 text colors measured live |
| 5 | Error Prevention | 3 | Backend is exemplary — advisory lock + anchor resolution + CAS, ambiguity returns 409 rather than guessing. Deduction only for zero friction on *un*-ticking finished work |
| 6 | Recognition Rather Than Recall | 2 | No `<h1>` on the home page at all (h1Count = 0); `h1 → h3` skip on the project page; `31d` meaning lives only in a `title` attribute |
| 7 | Flexibility and Efficiency | 1 | Zero keyboard shortcuts on a desktop tool opened daily. 13 tab stops to the first project link. No search, no filter, no jump. Skip link targets `#main`, which sits *above* Vision and habits |
| 8 | Aesthetic and Minimalist Design | 2 | 63% of the first screen (500 of 800px) is spent before the first project card; 2.3 full screens on mobile. Craft is real, budget is misallocated |
| 9 | Error Recovery | 2 | Copy is good ("Task changed underneath you.") but the 500 branch returns `String(e)` raw (`route.ts:103`) — an `EBUSY … open 'C:\…'` node error rendered at 11.5px with no retry |
| 10 | Help and Documentation | 3 | The inline write disclosure (`app/project/[slug]/page.tsx:101`) is excellent — right moment, plain language, names the file. Nothing explains pinning or the Vision aggregate |
| **Total** | | **22/40** | **Acceptable (low end) — significant improvements needed** |

## Design Specificity Verdict

**A beautifully textured skin on the canonical SaaS dashboard skeleton. The skeleton is generic; the paint is not.**

**LLM assessment.** Strip the CSS and the structure is the one every admin template ships: sticky notification bar → hero → KPI rail → featured panel → card grid → chip row → stat footer. Nothing in the composition says "this reads plain-text files off my disk and writes back into them."

What *is* specific and real: the paper/ink palette and Spectral numerals read as a bound notebook, not a control panel. The `Someday / parked` `<details>` fold as a literal Eisenhower quadrant. The provenance line `↳ slug · derived from roadmap` (`VisionBand.tsx:117`) — the app confessing where a number came from. The write disclosure naming `roadmap.md`. The `obsidian://` deep links. These are fingerprints of a tool built by its own user.

What is category-interchangeable, and it occupies the largest surfaces:
- **Unsplash stock photography on every surface.** `lib/view.ts:21-35` maps five life domains to five hotlinked stock photos — `career` → a stranger's desk, `health` → a road. 96px on every Calm card, 150px on the featured panel, a **200px full-width hero on every project page**.
- **The rotating famous-person quote widget** — a Notion-template trope, measured at **216px desktop / 534px mobile**.
- **The Calm/Bold card toggle** — a cosmetic A/B switch permanently docked in the header of a single-user tool, the most prominent "efficiency feature" on the page, changing nothing about the work.

The missed opportunity is glaring. This product's substance is *markdown in a vault*. There is no monospace anywhere, no visible path, no diff, no write receipt, no rendered markdown. Meanwhile the raw `**` the vault actually contains *does* leak through — as a bug, not as character. The most product-specific asset in existence (the owner's own prose) renders as generic chrome while stock photos of other people's desks take the biggest real estate.

**Deterministic scan.** `detect.mjs --json app components` → exit 2, **6 findings, all in `app/globals.css`, zero in any `.tsx`**:
- `side-tab` ×2 — `.why-card` (`:242`), `.subproject-block` (`:283`)
- `border-accent-on-rounded` ×2 — `.vision-detail` (`:398`), `.vision-caret` (`:399`)
- `layout-transition` ×2 — `.bar > i` (`:108`), `.vtile-bar > i` (`:390`)

**Confirmed false positives:** `.vision-caret` is a zero-size CSS triangle — the border *is* the shape. `.subproject-block` is an unrounded hierarchy indent for Project › Sub-Project › Phase nesting, not a card accent. Both dismissed.

**Where the detector caught what the design review missed:**
- **The type scale is continuous, not stepped.** 14 distinct rendered font sizes across a 10–22px band — **8 steps crammed into 10–16px**, including half-pixel steps (10.5, 11.5, 12.5). That is not a scale; it is drift. Plus 17 distinct text colors and 18 background colors.
- **`layout-transition` at scale** — 18 live instances of `transition: width` on progress fills, not the 2 the source scan implied.
- **`monotonous-spacing`** on the project page — 4px used in 17 of 18 spacing decisions (94%). The vertical rhythm has one value.
- `all-caps-body` on `.focus-sec` (57 uppercase chars), `dark-glow` on two pills, `clipped-overflow-container` on `.banner-hero` and `.d-hero`, `em-dash-overuse` (20 in body text).

**One detector finding I'm overruling as a brief conflict, not a defect:** `cream-palette` fires on `rgb(244, 236, 224)`. Warm-paper cream is genuinely the most-defaulted "tasteful" palette of this model era — the rule is not wrong about the population. But here it is a committed, coherent world doing real work (paper/ink for a text-vault reader), and it is the strongest specificity signal the app has. Keeping it is the right call. Flagged so you know it reads as era-typical to an outside eye, not as a change request.

**Visual overlays:** injection succeeded — mutation preflight passed (title + script both mutated and executed), overlay served from a background live-server on :8400, injected on both `/` and `/project/Personal_Finance`. **The server has since been stopped and verified down (connection refused on :8400), so the overlays are no longer live in your browser.** Console reported **30 anti-patterns on home** (15 `layout-transition`, 10 `low-contrast`, 4 `undersized-ui-text`, 2 `dark-glow`, plus `clipped-overflow-container`, `all-caps-body`, `em-dash-overuse`, `cream-palette`) and **14 on the project page** (9 `low-contrast`, 4 `undersized-ui-text`, `side-tab`, `skipped-heading`, `monotonous-spacing` and others).

## Overall Impression

The engine is better than the interface it feeds. The write path — advisory lock, content-based anchors, compare-and-swap, 409-on-ambiguity, idempotent replay — is the work of someone who takes their own vault seriously. `progressFor()` is a single function consumed by both surfaces so a percentage structurally cannot disagree with itself, and the UI *renders its own provenance*. That is a design principle enforced in code, and it is rare.

Then the interface spends 63% of the first screen on a stock photo of Warren Buffett before showing you a single project, opens every morning with a permanently red alarm about a cocktail party that already happened and is 91% done, and silently drops your second and third checkbox taps.

**The single biggest opportunity:** the vault already contains a literal list of next actions. `lib/view.ts:322-327` parses `now.nextActions`, `now.waiting`, `now.someday` from `NOW.md` — and `Dashboard.tsx:196` consumes `view.now.focus` only. A dashboard whose stated job is *"what to work on now"* computes the answer, throws it away, and shows a 44-second scrolling marquee of the surrounding paragraph instead. Everything else on this list is downstream of that.

## What's Working

**1. The numbers structurally cannot lie — and the app says so out loud.** `progressFor()` (`lib/view.ts:274-288`) is shared by the card and the detail page, so a percentage can never disagree with itself across surfaces. A Vision goal that links a project takes its progress *from that project's roadmap* rather than a typed-in figure, and renders the provenance: `↳ Career_Growth · derived from roadmap` (`VisionBand.tsx:116-118`). The failure mode of every personal dashboard is quietly becoming aspirational fiction. This one is architecturally prevented from doing that.

**2. Focus indicators are genuinely excellent — 38/38, verified.** One global rule at `globals.css:24` (`2px solid var(--accent)`, `outline-offset:2px`) with a light-on-dark override at `:27` for `.banner`, `.bold`, `.focus-hero`, `.d-hero`. Every focusable element in DOM order was individually driven into `:focus-visible` and confirmed to paint a ring at the correct offset with the correct override applied. Most dashboards fail this outright. Credit where it's due.

**3. The stretch-link idiom.** `globals.css:132-135` + `Dashboard.tsx:90` — the title's `::after` covers the whole card while the pin button stays a *sibling* at `z-index:6`. Full-card click target without nesting a `<button>` inside an `<a>`, which is the exact trap most card grids fall into. Applied consistently to the featured hero too, and the CSS comment explains why.

## Priority Issues

### [P0] Rapid ticks are silently swallowed

**What:** `components/TaskChecklist.tsx:28` — `if (busy != null) return;` is a *component-wide* lock. On the project page a single `TaskChecklist` holds an entire phase's tasks, so while one save is in flight, clicking any sibling checkbox returns immediately with no state change, no message, no visual response whatsoever. Compounding it: the in-flight row gets `disabled` (`:75`), so a keyboard user's focus drops to `<body>` mid-interaction and is never restored.

**Why it matters:** The morning ritual is "tick the three things I finished yesterday." Tap-tap-tap. Taps 2 and 3 vanish. You believe the write happened; the vault says otherwise. For an app whose entire value proposition is trustworthy write-back, a silent no-op is the worst available failure — worse than a visible error, because it is undetectable. This is the only P0 on the list because it is the one defect that produces *wrong data you won't notice*.

**Fix:** Replace the global lock with per-line in-flight state (a `Set<number>` of busy line numbers) and let independent lines write concurrently — the API is already idempotent and CAS-guarded per file (`route.ts:41-81`), so concurrency is safe. Never `disabled` the focused row; use `aria-busy` + reduced opacity so focus survives. If you must serialize, queue the clicks rather than dropping them.

**Suggested command:** `/impeccable harden`

### [P1] 63% of the first screen is decoration before any work appears

**What:** At 1280×800 the budget above the first project card is: Now ticker 35px + figure banner **216px** + Vision band **210px** + gutters — "Projects" lands at **y=506**, first card at **y=559**. At 375×812 the banner alone is **534px (66% of the viewport)** and the first project card sits at **y=1889** — **2.3 full screens of scrolling before a single project is visible.**

**Why it matters:** `CLAUDE.md` states the intent explicitly: *"the user iteratively compacts sections … so the projects sit above the fold."* Every compaction in that list was applied to the *work* — habits to a tab strip, completed tasks to a dropdown, areas to chips. The one element never compacted is the one carrying zero information. You have spent multiple sessions shrinking your own data to make room for stock photography of a dead investor.

**Fix:** Collapse `.banner-hero` to a single-line strip — portrait as a 28px avatar, quote as one truncated italic line in the topbar, "Another spark" as a small ✦ icon button. Target 56px instead of 216/534. That alone lifts the grid to ~y=350 desktop and above the fold on mobile. Files: `globals.css:55-84`, `Dashboard.tsx:198-222`. Note `globals.css:430` currently makes mobile *worse* — `padding:22px 20px 56px` plus `flex-direction:column` is what produces the 534px.

**Suggested command:** `/impeccable distill`

### [P1] The header alarm is permanently red about finished work, with no exit

**What:** `Dashboard.tsx:204-207` renders `view.deadline` as `.pill-overdue`. Live state: **`⏳ 41d overdue · LSEG Soirée Cocktail Booth`** — a project at **30/33 tasks, 91% complete**, for an event on 26 Jun 2026. `fmtDays` (`Dashboard.tsx:27-31`) has no notion of completion or of an event that has simply passed; `daysLeft` increments forever. Same treatment repeats on the card (`:101`) and the detail page (`page.tsx:139`). It will read "300d overdue" by year's end.

**Why it matters:** This is the first red element you see every morning and it is permanently wrong. An alarm that is always on stops being an alarm — textbook alert fatigue. Worse, it trains you to distrust the app's most emphatic signal, which will cost you the one time a deadline genuinely matters.

**Fix:** Three changes. (a) `lib/view.ts:366-368` — exclude from `greatSiege` any campaign whose status is `done`/`closing-out` or whose progress ≥ 95%. (b) `Dashboard.tsx:27-31` — cap the overdue language; beyond ~14 days render `past · 26 Jun` in neutral ink rather than `41d overdue` in warn red. An ever-growing negative number is shame, not information. (c) Give the pill a dismiss affordance persisted to a `workos.dismissedDeadline` cookie, matching the existing `setPrefCookie` pattern at `Dashboard.tsx:17-23`.

**Suggested command:** `/impeccable clarify`

### [P1] Screen-reader names are wrong or meaningless across three of six top-level regions

**What (all measured live):**
- **Area chips** compute accessible names `"Personal 3"`, `"Career 31d"`, `"Health 37d"` — while the `title` on the same button says `"No open todos"`. Tooltip and accessible name **contradict each other**. The meaning of `31d` exists only in a `title` on an inner `<span>` (`Dashboard.tsx:321`), which is not announced.
- **Habits tablist is malformed:** all four tabs report `aria-selected="false"` (a `tablist` requires exactly one selected), all four have `tabIndex=0` (the pattern requires roving tabindex + arrow keys; neither exists), and every tab's `aria-controls="ht-panel"` points at a node that **does not exist** in the default state. `HabitsReminder.tsx:28-49`.
- **No `<h1>` on the home page** (h1Count = 0, only two `<h2>`s); `h1 → h3` skip on the project page (`page.tsx:84`, `:100`) — confirmed independently by the overlay's `skipped-heading` rule.
- **Contrast failures**, both assessments agreeing on the numbers: `.now-ticker` white-on-gradient **3.36:1** (the page's single most prominent statement, and it's animated), `.area-chip-age` **3.07:1**, `.tag-chip.parked-chip` **3.75:1** at 10px, `.area-chip-count` **3.36:1**, `.deadline-chip.overdue` **4.14:1**, `.vision-plan` / `.ht-lead` **4.29:1**. Plus 4 elements of `undersized-ui-text` at 10–10.5px against an 11px floor.
- **Dormant Vision tiles are `disabled`** (`VisionBand.tsx:56`) — "health: no goal set" is information a screen-reader user can never reach.

**Why it matters:** These are not edge cases — they are the Areas row, the Habits strip, and the Now banner. Given that focus indicators were built to a genuinely high standard, this gap looks like the semantics were never audited rather than never cared about.

**Fix:** Add explicit labels — `` aria-label={`${a.name}: ${a.openCount} open todos, last touched ${a.lastTouchedDays} days ago`} `` on each area chip (`Dashboard.tsx:310-317`) and drop the contradicting `title`. Drop `role="tab"`/`tablist` from `HabitsReminder.tsx` entirely — this is a disclosure list, not tabs; use plain buttons with `aria-expanded` + a real per-habit panel id. Add a visually-hidden `<h1>` before `<NowTicker>`. Darken `--accent` for text-bearing surfaces, or set the ticker gradient to `--accent-deep → #a04d2c`. Raise the 10px chip text to the 11px floor.

**Suggested command:** `/impeccable audit`

### [P2] Raw markdown leaks into every blurb; sticky panels are taller than the viewport

**What:** (a) `lib/view.ts:297` sets `blurb: c.project.goal` verbatim. Live on 5 of 5 blurbs: *"…a multi-year personal-finance system that does `**`budgeting…"*, *"Gain from `**`66.6 kg → 70 kg`**`…"*. The detail page is worse — `.meta-row b` values measured at **311, 295 and 211 characters** of raw prose including `**` markers and backtick paths, rendered inside a 300px key/value sidebar. `NowTicker.tsx:15` already strips `**`. The fix exists and is applied to exactly one of six places it is needed.
(b) `.focus` is `position:sticky; top:18px` but measures **703.5px** in an 800px viewport; `.d-right` measures **938px**. A sticky element taller than `viewport − top` cannot pin — both scroll away, and the CTAs at their bottoms ("View full roadmap →", "↗ Open roadmap in Obsidian") are unreachable while scanning.

**Why it matters:** (a) makes the product's own substance appear as a rendering bug — every card looks slightly broken. (b) means the two "always available" navigation anchors aren't.

**Fix:** (a) Extract `NowTicker.tsx:15`'s `.replace(/\*\*/g, "")` into a shared `stripInlineMd()` in `lib/view.ts` and apply it in `campaignToCard` (`:297`) and to `hardDeadline` / `currentPhase` / `techStack` on the detail page; clamp `.meta-row b` to ~120 chars with a `title` for the rest. **Better still: don't strip it — render it.** Bold is meaningful in those goals, and a vault reader that displays markdown as markdown is the most on-brand move available. (b) Cap `.focus{max-height:calc(100vh - 36px); overflow-y:auto}` (`globals.css:90`) and `.d-right` likewise (`:245`), or move the CTAs to the top of each panel.

**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Alex (impatient power user)** — **13 tab stops** before the first project link. The skip link targets `#main`, which begins at the *Vision band* (`mainTop: 275`), so "Skip to content" still leaves the Vision rail and habits strip between him and his work. **He cannot read his own "Now" statement without waiting**: `NowTicker` truncates to 240 chars and scrolls at `nowscroll 44s linear infinite` (`globals.css:190`) — to read the most important line of text in the app he must hover to pause and then wait for the sentence to come back around. Rapid ticking silently fails; he is exactly the user who taps three checkboxes in a second. **"Another spark" is the most prominent button on the page** and does nothing but shuffle a stock quote. Opening a Vision dial pushes his project grid down **99px** (559 → 658) — he clicks to check a number and his work leaves the screen. No `/` to search, no `j/k`, no number-key jump. `.focus .next-list{max-height:30vh}` (`:93`) captures his scroll wheel over the featured panel.

**Sam (keyboard + screen reader)** — Five area chips announce as `"Personal 3"`, `"Career 31d"` with unexplained numbers and a contradicting tooltip; he cannot distinguish a stale area from a busy one. The habits `tablist` announces "tab list, 4 items" and then arrow keys do nothing. **Focus is dropped on every write** — `TaskChecklist.tsx:75` sets `disabled` on the row he just activated, browsers blur a disabled element to `<body>`, and he must Tab from the top of the document to reach task 2. On a 31-checkbox project page that is disqualifying. No `<h1>` on home, `h1 → h3` skip on detail, so heading navigation gives him only "Projects" and "Areas". The Now banner is 3.36:1 and animated. Write failures do carry `role="alert"` (`:115`) — genuinely correct — but the 500 path injects a raw Node string, so what gets announced could be `"EBUSY: resource busy or locked, open 'C:\Users\…'"`. **His one clean win: focus rings, which are correct everywhere.**

**Derived — the owner-operator, 7:04am, coffee, one decision to make** — **He wants to tick a habit and he cannot.** `lib/view.ts:352-364` computes `doneToday` per habit from `habits-log.md`. `HabitsReminder.tsx` never reads it — zero matches for `doneToday` in any `.tsx`. The habits strip is a read-only list of four labels. `globals.css:224-230` still carries `.habit`, `.habit-dot`, `.habit-dot.on` for the tickable version that no longer exists. The most 7am-shaped action in the product was built in the model, styled in the CSS, and dropped in the component. **His actual next-actions list is computed and thrown away** (`lib/view.ts:322-327` vs `Dashboard.tsx:196`). **Nothing tells him why the pinned project is pinned** — "★ Most important" is a cookie set on some previous morning, while `priority` (P1–P5) and `status` are parsed from the Eisenhower block, reach the card (`lib/view.ts:306-309`), and are **never rendered on the dashboard at all**. So he must reconcile three competing "what matters" signals unaided: the header says LSEG (overdue), the star says Personal Finance (a stale cookie), the Vision rail says career 64% / health 0%. Nothing resolves the conflict, so he resolves it himself, from scratch, every morning. That is precisely the cognitive work the product exists to eliminate.

## Cognitive Load: 6 of 8 FAIL (critical)

| Item | Result | Evidence |
|---|---|---|
| Single focus | **FAIL** | Six parallel systems compete: Now marquee, figure banner, Vision rail, Most-important panel, Projects grid, Areas + stats |
| Chunking ≤4 | **FAIL** | Projects **9**, Vision **5**, Areas **5**. Only Habits (4) and Stats (3) pass |
| Grouping | PASS | Proximity, borders and paper/bg contrast do real work; nesting habits inside the Vision box is correct |
| Visual hierarchy | **FAIL** | Ranked by size + contrast + motion the top three elements are the pulsing marquee, the Buffett portrait, and "Another spark". The most decision-relevant fact — *LSEG is 91% done and past its date* — is an 11.5px chip at 4.14:1 |
| One thing at a time | **FAIL** | The primary write action sits among 43 other interactive elements |
| Minimal choices ≤4 | **FAIL** | See decision points below |
| Working memory | **FAIL** | Answering "what do I work on?" requires holding the header deadline, the pin, six card percentages, five Vision percentages and three staleness flags — and **nothing on the page reconciles them** |
| Progressive disclosure | PASS (caveat) | All five folds correctly closed by default. **Caveat: opening one Vision dial pushes every project card down 99px** — disclosure destroys the primary content |

**Decision points with >4 visible options:** Projects grid (9 cards, each with 7 sub-elements) · Vision rail (5 expandable dials) · Areas (5 expandable chips) · the page as a whole (**44 interactive elements, 19 above the fold**) · project detail (**31 checkboxes across 6 sub-projects and 12 phase blocks, all open simultaneously, in a 3,721px document**).

## Emotional Journey

**The 7am open is dread, and it is structural.** First render: a sticky orange marquee. Second: `⏳ 41d overdue · LSEG Soirée Cocktail Booth` in warning red — for a cocktail booth for a party that happened on 26 Jun 2026 and is 91% done. Immediately below: `Career 31d` · `Health 37d` · `Learning 37d` in gold — three neglect flags. The emotional content of the first 500 pixels is *a dead billionaire on planting trees, a red failure notice, and three reminders that you've abandoned your health.* At y=559, a project finally appears.

**The peak is unmarked.** The single moment of genuine satisfaction in this product — ticking a box and watching it write into your own vault — has no celebration whatsoever. No micro-animation, no count-up, no acknowledgement when a phase hits 100%. `.bar > i` has a 0.5s width transition (`globals.css:108`) but `router.refresh()` re-renders the server component, so it usually snaps. The app's best feeling is a silent CSS repaint.

**The end is inventory.** The last thing on the page every day is three grey chips — Inbox / Resources / Archive — counts of undone filing, with no link and no action. You close the day looking at a backlog tally.

Peak-end summary: the peak is muted to silence, the end is a backlog count, and the open is a red alarm about a finished party. The engineering is trustworthy and the interface makes it feel accusatory.

## Minor Observations

- **The type scale is drift, not a scale** — 14 rendered sizes, 8 of them inside 10–16px, with half-pixel steps (10.5, 11.5, 12.5). Plus 17 text colors and 18 backgrounds. Collapse to ~6 steps and ~8 inks.
- **`monotonous-spacing`** on the project page — 4px in 17 of 18 spacing decisions (94%). One rhythm value for everything.
- **`Crown.tsx` is a star**, per its own header comment ("swapped to a star 2026-06-28 because the crown drew too much attention"). The component, `.crown-badge` / `.crown-btn`, and every `aria-label` ("Pin X as the most important project") still say crown — and the `aria-label` and visible `title` disagree with each other.
- **Three perpetual motions on a page whose stated identity is "calm"**: `.crown-badge` bobs on a 3s infinite loop (`globals.css:175`), `.now-live` pulses every 2s, the marquee runs 44s.
- **Mobile gutter mismatch on the Now bar** — `globals.css:424` drops `.wrap`/`.topbar`/`.banner-content` to 24px at ≤880px, but `.now-ticker-label{padding-left:48px}` (`:184`) and `.now-ticker-viewport{padding-right:48px}` (`:187`) aren't in that block. The topmost element on mobile is the one that doesn't align.
- **30 of 44 touch targets are under 44×44 on desktop, 33 on mobile** — every pin button at **34×34**, "read the plan ↗" at **72×18** (smallest), project titles at 24px tall, area chips at 34, habit tabs at 37.
- **The Vision rail orphans a dial on mobile** — `repeat(2,1fr)` (`:405`) with 5 items gives 2 + 2 + 1.
- `.b-scene-cap` — *"backdrop: Omaha, Nebraska — Berkshire Hathaway's home"* — an absolutely-positioned photo credit for a stock image. Correctly hidden on mobile; the right instinct applied to the wrong element.
- `.todo-more` renders *"+10 more in the roadmap ↓"* (`TaskChecklist.tsx:91`) as inert text — the ↓ implies scrolling, the content is on another page, and it isn't a link.
- **Empty state is effectively dead** — `Dashboard.tsx:285` only renders when there is exactly one project total. Nicely written, unreachable.
- **Dead CSS confirming removed features**: `.habit`/`.habit-dot`/`.habit-cad`/`.key-chip` (`:224-230`) and `.mini`/`.mini-th`/`.mini-t` (`:110-115`) are unreferenced.
- **Clean bill on the boring stuff**: 0 console errors, 0 warnings, 0 failed requests, no horizontal overflow at 375px, DCL 226ms / load 534ms. 2.1MB transfer is the one number worth watching — 11 of 12 images carry `alt=""`, which is defensible for the hero but arguable for the 10 project thumbnails that carry project identity.
- `app/not-found.tsx` is the calmest, clearest screen in the app. One icon, one heading, one sentence, one link. It is what the dashboard should aspire to.

## Questions to Consider

1. **What if the dashboard rendered *one* project and nothing else?** The featured panel already contains everything needed to act — hero, name, why, progress, active phase, next three tasks. The other eight cards, five dials, five chips and three stats exist to reassure you they still exist, which is the exact anxiety a PARA vault already resolves. What would you actually lose by making home a single card and moving the grid to `/projects`?
2. **The vault contains a literal list of next actions and the app throws it away.** Why is the "what to work on now" dashboard deriving priority from a cookie, an Eisenhower flag it never renders, and five roadmap percentages — instead of reading the list you already wrote?
3. **What does this look like if it looks like markdown?** Monospace, `- [ ]` glyphs, visible relative paths, a real diff toast on write: `roadmap.md:41 · [ ] → [x]`. Right now the app is embarrassed by its own substrate and covers it with photographs of strangers' desks. What if the substrate *were* the aesthetic?
4. **The Buffett quote occupies 216px desktop / 534px mobile — more than every project card combined.** If the answer to "why is it there?" is *inspiration*, would you rather be inspired by a dead investor's aphorism or by your own last-30-days completion streak, rendered at the same size?
5. **The overdue pill will read "300d overdue" by year's end.** At what number does an unresolvable red alarm stop being accountability and start being a reason not to open the app? What is the design of *forgiveness* here — archive, snooze, "call it done", or something that simply recognises 91% and a passed event date as finished?
