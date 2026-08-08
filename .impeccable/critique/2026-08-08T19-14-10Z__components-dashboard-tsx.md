---
target: WorkOS Dashboard home surface
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-08T19-14-10Z
slug: components-dashboard-tsx
---
Method: dual-agent (A: design review, unanchored and walled off from the prior critique · B: detector + measured browser evidence, isolated)

Target: `components/Dashboard.tsx` (home surface, via `app/page.tsx`) + `app/project/[slug]/page.tsx`. Mode: **Operate**.

Evidence caveat: pixel screenshots were again unavailable (the Browser pane does not composite frames). Every visual claim is grounded in measured geometry, computed styles, canvas-sampled backdrop contrast, and accessibility-tree dumps. Both agents were explicitly forbidden from reading `.impeccable/` or git history, so neither is anchored to the previous critique or to my own claims about what I fixed.

Environment note: mid-review the dev server hit the `jest-worker` session-boundary breakage documented in `CLAUDE.md` — `/` stayed 200 while every `/project/*` returned 404/500. Assessment A reviewed the detail route from source only; Assessment B's project-route measurements are void, not clean. I repaired it afterwards (stop workers → `rm -rf .next` → restart) and re-verified: `/` 200, `/project/Personal_Finance` 200, bogus slug now a proper **404** (so `not-found.tsx` renders, which A could not confirm).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Write receipts + live regions are genuinely best-in-class. But `FreshnessProbe` still `router.refresh()`es silently every 15s, and `view.scannedAt` is computed and never rendered — nothing says when the vault was last read |
| 2 | Match System / Real World | 3 | Vault nouns match the mental model exactly. But "Legacy" is a noun labelling an expand action, and `+10 more in the roadmap ↓` points **down** at nothing — the rest is on another route |
| 3 | User Control and Freedom | 2 | **No undo on the home page.** `Dashboard.tsx:300` passes `limit={3}`; `TaskChecklist.tsx:183` gates the Completed fold on `limit == null`, so `.focus .done-toggle` count is **0**. Tick a task and it leaves the screen with no way back |
| 4 | Consistency and Standards | 2 | Two sibling disclosures in the *same box* behave oppositely — the Vision dial floats on a zero-height anchor while the habit panel pushes the work column down **159px**. 12 font sizes, 10 border radii |
| 5 | Error Prevention | 2 | Server is exemplary (lock + anchor + CAS + idempotent). The client prevents nothing: one click writes to a Drive-synced file, no confirmation, no undo window, row disappears |
| 6 | Recognition Rather Than Recall | 2 | Habit tabs show four names and **no completion state** — `doneToday` is parsed, shipped to the client, and rendered nowhere. Card blurbs show a median **20%** of their text; the worst shows **3%** |
| 7 | Flexibility and Efficiency | 2 | **12 tab stops** from the skip link to the first checkbox. No search, no filter, no sort, no shortcut. Calm/Bold remains the only power affordance and changes no information |
| 8 | Aesthetic and Minimalist Design | 2 | Stated goal is a calm *one-page* app. Measured: 1293px desktop (1.8 screens), **3026px mobile (3.7 screens)**. 51% of all text is ≤12px |
| 9 | Error Recovery | 3 | `writeFailureReason` gives real causes, receipts carry path + line, "Try again" re-fires the exact anchor. Gap: a 409 tells you the task changed but not what it now says |
| 10 | Help and Documentation | 3 | The write-note states the contract in plain language; Obsidian deep links are right. The banner's "Legacy" affordance is undiscoverable; no empty-state guidance for a fresh vault |
| **Total** | | **24/40** | **Acceptable — real gains in correctness, structure untouched** |

## Design Specificity Verdict

**Structurally still a generic SaaS dashboard. Texturally it is not — and two product-specific details now carry the whole identity.**

**LLM assessment (unanchored).** The composition remains the category default: sticky status bar → hero banner → KPI rail of five equal dials → sticky sidebar + card grid → chips → stat chips. Swap the copy and this is a CRM or a fundraising tracker. The five-dial Vision rail is the single most interchangeable element — five equal-weight gauges, two reading `0%`, placed *above* the day's work.

What *is* specific is excellent and confined to two places:
- **The write receipt** renders the vault's own language: `Personal_Finance/roadmap.md:19`, monospace, literal `[ ] → [x]`. No generic dashboard shows you the substrate.
- **The deadline vocabulary** — an overdue counter that degrades from `41d overdue` to `was due 26 Jun` past 14 days is a real editorial position about what a personal tool owes its single user.

Both are *writing*, not composition. The layout never learned from them.

The unchanged miss: **10 project images, only 7 unique files** — `photo-1543783207` appears 3× on one screen. Unsplash IDs are hardcoded per *domain*, so every career project is the same desk. Meanwhile the project's real identity is computed and thrown away: `view.now.nextActions` and `view.now.waiting` (0 references), `habits[].doneToday` (0 references), `card.priority` P1–P5 (0 references on the dashboard card). `.habit-dot.on` sits styled and unused.

**Deterministic scan.** 6 findings, all in `app/globals.css`, **zero in any `.tsx`** — unchanged in count across four refinement passes, which is itself evidence that none of those passes introduced drift. Both agents independently dismissed the same three as false positives (`.vision-caret` is a zero-size CSS triangle; `.vision-detail`'s top border is a neutral `--line` tie-back to the clicked dial; `.subproject-block` is a hierarchy indent rail, not a card accent). The one genuine slop finding is `.why-card`'s `border-left:3px solid var(--accent)` on a rounded, shadowed card — textbook side-tab.

**Visual overlays.** Injection succeeded on home (mutation preflight passed, live-server on :8400, stopped and verified). Console reported 2 rows: `overused-font` and `em-dash-overuse`. **`overused-font` is a false positive** — no rendered text uses Arial; it appears only in the UA fallback stack inherited by 16 non-rendering nodes (`<head>`, `<meta>`, `<script>`). Measured reality is 2 families: DM Sans (110 nodes), Spectral (45). **`em-dash-overuse` is real**: 22 em-dashes over 5,186 chars = 2.12 per 500, roughly 2× threshold. Project-route injection ran but the document was Next's 453-byte dev error stub — recorded as void, not clean.

## Overall Impression

**The correctness work landed; the composition problems were never in scope, and they are what's holding the score down.**

Four passes fixed real, verifiable defects: concurrent writes no longer drop silently, the deadline alarm no longer lies, the banner costs 86px instead of 216 on desktop, the habits strip stopped claiming an ARIA contract it never implemented, and raw `**markdown**` no longer leaks into every blurb. Both agents independently confirmed the write receipt and the deadline vocabulary as the strongest things in the product. Detector findings held flat at 6 across all four passes.

But the score moved **22 → 24**, and that number is honest. Every structural issue from the original critique survives untouched, because the approved scope was P0+P1 correctness, not composition: 57% of the first screen is still preamble, the first project card on mobile is still ~1661px down (2.0 viewport-heights), the Vision rail still sits above the work, and the app still computes `nextActions`, `doneToday`, and `priority` and renders none of them.

**Two findings land directly against my own audit pass**, and I verified both myself rather than taking the agents' word: the checkbox border and focus ring fail *non-text* contrast (WCAG 1.4.11 / 2.4.11), which I never checked because I audited only text pairs; and five elements inside the Vision band fail against the actual `life-journey.png` backdrop, which I scored as passing because I measured against the nearest opaque ancestor instead of the painted image.

## What's Working

**1. The write receipt is the best idea in the product.** It refuses to reconstruct anything client-side — the API returns the record it journalled and the UI echoes it, so a receipt *cannot* describe a write the vault didn't take. `beforeMark` preserves the file's literal `[X]` vs `[x]`. Successes are `role="status"`, failures `role="alert"` with a retry that re-fires the same anchor. Assessment A, with no knowledge of the prior work, independently called it "trust engineered into pixels" and "the product's thesis rendered as UI."

**2. The deadline tone system.** One `deadlineLabel()` feeds the header pill, the card chip, and the detail page, so they cannot drift. A verified it firing correctly on LSEG Soirée (44 days past, 91% done, tone `quiet`) and noted that `warn` never appeared on this vault — which is exactly what the design intends. The 14-day grace window protects the credibility of deadlines that *do* fire.

**3. Write-path keyboard focus restoration.** Ticking unmounts the row; the component restores focus to whatever now occupies the vacated slot, but **only** when `:focus-visible` matched, so a mouse tick doesn't yank focus. Rows are never `disabled`. A flagged this unprompted as "craft most production apps skip."

**Also verified corrected:** the habits strip's fake `role="tablist"` is gone (B confirms 0 tab roles); the crown button's 34px circle genuinely hit-tests at 44×44 via `::after{inset:-5px}`; `.stretch-link` click areas resolve to the full card; Escape closes the Vision popover *and* returns focus to the originating dial; **0 touch targets under 44×44** across all 45 controls.

## Priority Issues

### [P0] The "Now" statement is truncated, animated, and unreadable on mobile

**What:** `NowTicker.tsx:15` takes `focus.split("\n")[0]`, discarding everything after the first newline. I verified the live rendered string: *"You're in the sustainable-normal stretch following the ~3-week reset (from 2026-06-17). **The rule:**"* — it promises the rule and the next line is thrown away. It's then a 44s marquee: 1396px of text in a 1153px window at desktop, **698px in a 287px window (41% visible) at 375px**. The pause selectors are `:hover` and `:focus-within`, and `.now-ticker` contains **0 focusable descendants** (verified) — so on a phone that sentence can be neither paused nor read in full.

**Why it matters:** in Operate mode this is the sentence answering "what am I doing today." It's the most visually dominant element on the page, it's incomplete, and it fails WCAG 2.2.2 (moving content with no pause mechanism).

**Fix:** render the whole `focus` block, not `[0]`; clamp to 2 lines at 14px and drop the marquee. If motion must stay, add a real `<button>` pause control inside `.now-ticker` so `:focus-within` has something to hook and touch users have an affordance.

**Suggested command:** `/impeccable clarify`

### [P1] Non-text contrast fails on the app's primary control and its focus ring

**What (verified myself, not just reported):**
- Unchecked checkbox border `--line` `#e7dac8` on `--paper` = **1.28:1**. The primary write control of the entire application is effectively borderless. WCAG 1.4.11 requires 3:1.
- Focus ring `--accent` `#d2724a` = **2.87:1** against the page background `--bg`, **3.12:1** against card paper. Fails SC 2.4.11 on the majority surface.

**Why it matters:** this is the one gap my audit pass structurally could not catch — I measured text pairs only, so a 2px border and an outline never entered the sample. For a low-vision user the unchecked state has no perceivable boundary, and the focus ring is the entire orientation system.

**Fix:** `.box` border → `var(--ink-faint)` `#7d6a58` (4.79:1). Focus ring → `var(--ink)` at 2px with a 2px `--paper` offset ring (13.5:1 on both grounds).

**Suggested command:** `/impeccable audit`

### [P1] Five Vision-band elements fail contrast against the actual image backdrop

**What:** `.vision` is `linear-gradient(rgba(251,246,238,.4), rgba(251,246,238,.74)), url(/life-journey.png)`. Measured by canvas-sampling the real painted backdrop and compositing the cream overlay plus each element's own translucent layers — reproduced independently by me and by Assessment B, agreeing within rounding:

| Element | Worst ratio | Backdrop at worst |
|---|---|---|
| `.vision-active` | **1.85** | rgb(161,154,140) |
| `.ht-star` | **3.87** | rgb(222,219,208) |
| `.vtile-sub` | **4.19** | rgb(235,232,222) |
| `.vtile-caret` | **4.28** | rgb(237,234,224) |
| `.ht-lead` | **4.46** | rgb(225,222,212) |

The effective backdrop spans rgb(160,162,144) to rgb(253,251,247) — a **3.9:1 luminance spread inside one surface**, which is why the same colour passes in one tile and fails in another.

**Why it matters:** my audit reported these as passing because I walked up to the nearest opaque ancestor (paper) rather than sampling the image. Any text over a photographic backdrop needs the backdrop sampled, or a guaranteed floor imposed.

**Fix:** don't chase per-element colours against a rotating image. Raise the cream overlay's floor (e.g. `.62 → .88`) so the band has a guaranteed minimum luminance, then re-measure. Alternatively give the text elements their own opaque chips.

**Suggested command:** `/impeccable audit`

### [P1] Ticking a task on the home page is irreversible in place

**What:** `TaskChecklist.tsx:183` gates the Completed fold on `limit == null`, and `Dashboard.tsx:300` passes `limit={3}`. Measured: `.focus .done-toggle` = **0**. A ticked a real task and watched the row leave the panel with task #4 sliding into its place; recovery requires navigating to `/project/<slug>` — which was 500ing at the time, i.e. the only recovery path is not guaranteed to exist.

**Why it matters:** the home panel is where the owner ticks things at 7am, often on a phone, and a mis-tap writes to a Drive-synced file with no reversal. The harden pass made writes *trustworthy*; it didn't make them *reversible*.

**Fix:** render the Completed fold whenever `doneTasks.length > 0`, slicing done items to ~3 as well. Or keep the just-ticked row in place for ~8s with an Undo in its own receipt — `WriteReceipt.tsx` already has the `rc-actions` pattern and the retry plumbing.

**Suggested command:** `/impeccable harden`

### [P2] Two sibling disclosures in the same box behave oppositely, and one occludes the other

**What:** The comment at `globals.css:486` documents the exact lesson learned during the distill pass — *"Inline, it pushed every project card 99px down the page."* The habit panel, sitting 30px below in the same `<section>`, does precisely that: measured **159px** of displacement, worse than the bug that was fixed. And with a Vision dial open, `elementsFromPoint` over the habit strip returns `.vision-goal-label` above `.ht-tab` — the popover **completely covers the habits row**, while those tabs remain in the tab order underneath it.

**Why it matters:** a keyboard user can Tab into a control they cannot see, and the fix applied to one disclosure was never propagated to its sibling 30px away.

**Fix:** give `.ht-panel` the same zero-height anchor treatment, and reserve vertical room (or shift the popover below the strip) so the two never overlap.

**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Alex (impatient power user)** — **12 tab stops from the skip link to the first checkbox**: `read the plan` → 5 Vision dials → 4 habit tabs → project title → first task. Eleven of those are decoration. No search, no filter, no sort, no shortcut across nine projects and five areas. The Now marquee costs up to 22 seconds to read one sentence that then ends in a colon. Calm/Bold remains a decoy — the most prominent control in the Projects header, changing only styling (A independently reached the same verdict I did during polish: same fact, different position). Ticking three tasks fast works correctly now, but stacks three receipts with no bulk dismiss.

**Sam (keyboard + screen reader)** — **The heading outline is three items**: hidden `h1` → `h2 Projects` → `h2 Areas`. The Most-important panel, Vision 2026, Daily habits, and Someday/parked have **no headings at all**, so heading navigation cannot reach the panel containing today's tasks. `h2 Areas` is nested inside the `<div>` that `h2 Projects` heads, so the outline lies about containment. Focus ring 2.87:1 and checkbox border 1.28:1 (above). `FreshnessProbe` refreshes every 15s with no announcement — if a task Sam is focused on gets ticked in Obsidian, the row unmounts and focus drops to `<body>`; the restoration logic only arms after Sam's *own* keyboard tick. The Vision popover occludes habit tabs that stay focusable underneath it.

**One correction to a prior claim:** Assessment B reported "0 of 15 `aria-expanded` elements have `aria-controls`." That reading is from the collapsed state only. I verified live that area chips and habit tabs both set `aria-controls` when expanded and that the target node exists (`area-panel`, `ht-panel`) — deliberate, since pointing at a node that doesn't exist is the exact defect the audit pass fixed. B's measurement is accurate but its framing is misleading.

**The owner-operator at 7am** — On the phone he scrolls **1661px, over two full screens**, before seeing a single project: a Gutenberg quote, five gauges (two reading 0%), four habit names, and a 776px pinned-project panel. **The habit strip still cannot tell him whether he did the habit today** — `doneToday` is parsed, mapped, serialized to the client, and rendered nowhere; `.habit-dot.on` sits styled and unused. The one sentence written to orient him is cut off at "The rule:". He cannot untick a mis-tap. Nothing marks a *project* as cold — the Area chips got a staleness badge, the projects he actually decides between did not. And the page's last word remains `4 Inbox · 0 Resources · 8 Archive`: the morning ends on debt.

## Cognitive Load: 5 of 8 FAIL

Improved from 6/8 — working memory now passes (the receipt echoes what you did) and progressive disclosure passes (five working disclosure mechanisms). Still failing: single focus (seven co-equal content groups), chunking (5 dials / 6 cards / 5 chips), visual hierarchy (the loudest element is a sentence ending in a colon; second loudest is a 140px hero for a quote; the actual decision is third), one-thing-at-a-time, and minimal choices.

## Minor Observations

- **12 distinct font sizes**, seven crammed between 10 and 14px where half-pixel steps are visually indistinguishable. **10 distinct border radii.** Both agents flagged this independently; it is the clearest remaining system-drift signal.
- **`.focus` sticky panel clips its own CTA** — height 684px, `scrollHeight` 793px. "View full roadmap →" sits in the clipped 109px, requiring a scroll *inside* the panel, which is the exact failure the distill pass's cap was meant to prevent. The cap is correct; the content simply exceeds it.
- **`.now-sep` ✦ at 2.47:1** against the composited ticker gradient — a real fail on a decorative separator.
- **`em-dash-overuse` is real**: 22 em-dashes, 2.12 per 500 chars.
- **`+10 more in the roadmap ↓`** — the arrow points down at nothing; the tasks are on another route reached by a `→` link 12px below.
- **"Legacy" as a button label** is a noun where a verb belongs. The `aria-label` says the right thing; the visible label doesn't.
- **Ragged card rows** — heights 149/149/149/204/149/170/174/195/174, a 55px step because the deadline chip and 2-line titles are unbudgeted.
- **`.vision-caret` is `display:none` below 880px** — on mobile the popover loses its only link back to the dial that opened it.
- **Dead CSS still present**: `.habit`, `.habit-dot`, `.habit-cad`, `.key-chip`, the `.mini*` family, `.stripes`.
- **12 images, 1 meaningful alt.** The 10 Unsplash project thumbnails carry `alt=""` — defensible as decorative, arguable since they carry project identity.
- **Clean on the boring stuff**: 0 console errors on a clean load (one stale HMR 404), no horizontal overflow at 375px, DCL 274ms / load 655ms. The 2,245KB transfer is 2,154KB of unminified dev chunks — not a production signal.
- **Reduced motion is comprehensively handled** — 6 `@media` blocks including a universal reset and a dedicated rule converting the marquee to static wrapped text. Genuinely good.

## Questions to Consider

1. **If you deleted the Vision band, the figure banner, and the Now ticker, would you make a worse decision at 7am — or a faster one?** None of the three is an input to *which project do I open*. What breaks if the annual and inspirational layers become a second page you visit on Sundays?
2. **Why is the answer a grid of nine projects instead of one sentence?** The app already computes everything needed to say *"Open Personal Finance. Phase 2, task 1 of 14."* You built a Most-important panel and then put six equal competitors beside it.
3. **The write receipt shows the vault's own language and both reviewers called it the best thing here. What if the whole checklist rendered as markdown source** — `- [ ] task` with a real clickable `[ ]`? You'd delete a design system, gain total honesty about the substrate, and look like nothing else. Right now the vault is visible for exactly 4 seconds after a write.
4. **Why does a habit strip that knows whether you did the habit today refuse to tell you?** `doneToday` is parsed, mapped, serialized, and dropped. Should habits be a checkable reminder that writes to `habits-log.md` the same way checkboxes write to `roadmap.md`?
5. **Ten photographs, seven unique, none of anything you own.** What would fill that space if imagery were disallowed — days since last session, current phase, the next literal task, the file path? Which would you actually miss at 7am?
