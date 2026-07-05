# WorkOS Dashboard — UX/UI Review & Improvement Requirements

**Reviewer:** UX/UI Designer
**Date:** 2026-06-24
**Scope:** Shipped surface — `/` (dashboard) and `/project/[slug]` (project detail), plus the
shared design system in `app/globals.css`.
**Method:** Code-based heuristic evaluation (Nielsen heuristics + WCAG 2.1 AA). No live vault was
run, so findings are derived from the source. Items marked *(verify in browser)* should be
confirmed against a running instance with a real vault.

---

## 1. Executive summary

The WorkOS Dashboard is a thoughtfully designed "calm reader/writer" with a warm, editorial visual
language (Spectral + DM Sans, paper palette, soft shadows). The information model is sound and the
core loop — *see what matters now → open a project → tick a task that writes back to the vault* — is
clear. The product has genuine personality (rotating historical-figure banner, Calm/Bold card
modes, the crown "most important" mechanic).

The biggest gaps are **not** visual polish — they are **accessibility and "promised-but-missing"
capability**:

1. **The core action is not keyboard-operable.** Task checkboxes are `<div onClick>` with no
   keyboard handler, and there are **no visible focus indicators anywhere** in the app. A keyboard
   or screen-reader user cannot reliably complete the one thing this app exists to do.
2. **An entire accessibility/settings layer is built but disconnected.** `lib/settings.ts` defines
   light mode, UI scale, reduce-motion, high-contrast, and colorblind options — but nothing imports
   it, no settings UI exists, and the CSS honors none of the data attributes it sets.
3. **Performance/quality basics are skipped.** Fonts load via a render-blocking `@import`; all
   imagery is hotlinked from Unsplash/Wikimedia as raw `<img>` with no dimensions — inviting layout
   shift, slow LCP, and broken images if a URL 404s.

None of these require a redesign. They are well-scoped fixes. The prioritized backlog is in §9.

---

## 2. What's working well (keep)

- **Clear primary task & write-back loop.** Optimistic toggle with revert-on-error in
  [TaskChecklist.tsx](../../components/TaskChecklist.tsx) is the right pattern, and the "ticking a
  box writes to `roadmap.md`" note sets honest expectations.
- **Live freshness without a blind timer.** [FreshnessProbe.tsx](../../components/FreshnessProbe.tsx)
  revalidates on a cheap version probe + window focus — good perceived freshness.
- **Single, consistent progress rule.** `progressFor()` in [view.ts](../../lib/view.ts:121) keeps
  the card % and the detail % identical, which avoids a classic trust-eroding mismatch.
- **Calm visual system.** Coherent tokens (`--ink`, `--paper`, domain accents, `--r`, shadow scale)
  and restrained motion intent.
- **Empty states exist** for "no projects", "no roadmap phases", and "not found".

---

## 3. Severity legend

| Level | Meaning |
| --- | --- |
| 🔴 Critical | Blocks a user group from a core task, or risks data/trust. Fix first. |
| 🟠 High | Significant friction or a clear accessibility/quality failure. |
| 🟡 Medium | Noticeable friction, inconsistency, or missed opportunity. |
| ⚪ Low | Polish, cleanup, or nice-to-have. |

---

## 4. Accessibility findings

### 🔴 UX-01 — Task checkboxes are not keyboard operable
**Where:** [TaskChecklist.tsx:55-67](../../components/TaskChecklist.tsx:55)
The task row is a `<div role="checkbox" onClick>` with no `tabIndex` and no `onKeyDown`. It cannot
receive focus or be toggled with Space/Enter. This is the app's **core write action**, so the whole
product is mouse-only today (WCAG 2.1.1 Keyboard — fail).
**Requirement:** Make each row focusable and operable: render it as a real `<button>` (or add
`tabIndex={0}` + `onKeyDown` for Space/Enter), keep `role="checkbox"` + `aria-checked`, and add an
`aria-label` describing the task. Same applies to the area "cards" if they ever become interactive.

### 🔴 UX-02 — No visible focus indicators anywhere
**Where:** [globals.css](../../app/globals.css) (no `:focus-visible` rule exists; `button { … }` at
line 20 strips native chrome).
Every button/link relies on the browser default outline, which is largely suppressed by the custom
styling. Keyboard users have no idea where they are (WCAG 2.4.7 Focus Visible — fail).
**Requirement:** Add a global, on-brand focus style, e.g.
`:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: inherit; }`
and verify it reads on dark surfaces (banner, bold cards) — use a light ring there.

### 🟠 UX-03 — Reduce-motion is only honored for one element
**Where:** [globals.css:150](../../app/globals.css:150) covers only `.hr-detail-wrap`/`.hr-caret`.
The infinite crown bob (`crownbob 2.6s … infinite`, line 117), `fadeup`, `crownwiggle`, `nudge`,
hover lifts, and bar transitions ignore `prefers-reduced-motion`. The always-animating crown is a
vestibular-discomfort risk (WCAG 2.3.3).
**Requirement:** Wrap non-essential animation in a global
`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } }`
and stop the crown bob entirely under that query.

### 🟠 UX-04 — Secondary text fails AA contrast
**Where:** `--ink-faint:#9a8675` on `--paper:#fbf6ee` ≈ **3.2:1**, used at 11–13px (e.g. card meta,
`.mini-m`, `.b-years`, captions). AA for body text needs 4.5:1. (`--ink-soft` ≈ 6.3:1 is fine.)
**Requirement:** Darken `--ink-faint` to ~`#7d6a58` (≈4.6:1) or stop using it below 16px. Re-check
white-on-image captions (`.cap`, `.b-scene-cap`) which depend on a translucent scrim.

### 🟠 UX-05 — Interactive button nested inside an anchor (invalid + unpredictable)
**Where:** `CrownBtn` is rendered inside the card `<Link>` in
[Dashboard.tsx:73](../../components/Dashboard.tsx:73) and
[Dashboard.tsx:90](../../components/Dashboard.tsx:90).
A `<button>` inside an `<a>` is invalid HTML; it works today only because of
`preventDefault()/stopPropagation()`. Screen readers and some browsers handle the nesting
inconsistently.
**Requirement:** Restructure so the crown control is a **sibling** of the link (card as a
positioned container; the link covers the body via a stretched `::after`, crown button on top), or
move "Make most important" into a project context menu.

### 🟠 UX-06 — Unlabeled icon-only controls
**Where:** `.crown-btn` has a `title` but no `aria-label`; its `Crown` SVG is `aria-hidden`
([Dashboard.tsx:44](../../components/Dashboard.tsx:44)). The "✦ Another spark" and Calm/Bold toggle
also lack programmatic state.
**Requirement:** Add `aria-label="Make {project} the most important project"` to the crown button;
add `aria-pressed` to the Calm/Bold toggle ([Dashboard.tsx:254](../../components/Dashboard.tsx:254));
ensure every emoji that conveys meaning has a text equivalent (see UX-13).

### 🟡 UX-07 — Missing landmarks & skip link
**Where:** [Dashboard.tsx:139](../../components/Dashboard.tsx:139) — the top bar is a `<div>`, not a
`<header>`/`<nav>`; there is no skip-to-content link. Project nav (breadcrumb) is also a bare `<div>`.
**Requirement:** Use `<header>`, `<nav aria-label="Breadcrumb">`, and a visually-hidden
"Skip to content" link targeting `<main>`.

---

## 5. "Built but disconnected" — capability gaps

### 🟠 UX-08 — The entire settings/accessibility layer is orphaned
**Where:** [lib/settings.ts](../../lib/settings.ts) exports `loadSettings/saveSettings/applySettings`
and a rich `DashboardSettings` (theme, `uiScale`, `reduceMotion`, `highContrast`, `colorblind`,
`celebration`, `goldFlash`). **Nothing imports it** (only references are the file itself and the
knowledge graph), there is **no settings UI**, `layout.tsx` never applies it, and `globals.css`
defines none of the `[data-theme="light"]`, `--ui-scale`, `[data-contrast="high"]`,
`[data-colorblind]` rules it toggles. Also, `DEFAULT_SETTINGS.theme` is `"dark"` while the actual
shipped palette is a warm **light** theme — a stale leftover from the de-Sovereign refactor.
**Requirement (decide one):**
- **(A) Wire it up** — add a settings panel (gear in the top bar), call `applySettings` from a
  client boot effect in the layout, and add the matching CSS (`[data-theme="light"]` token
  overrides, `font-size: calc(1rem * var(--ui-scale))` on `:root`, high-contrast/colorblind token
  sets). This directly resolves UX-03/04 for users who opt in.
- **(B) Delete it** for now and track as a future feature, so the codebase doesn't imply a
  capability that doesn't exist.
Either way, fix the `theme` default to match reality.

### 🟡 UX-09 — Dead CSS and unused dependencies
**Where:** `@keyframes toastpop` ([globals.css:24](../../app/globals.css:24)) and `nudge`
([line 27](../../app/globals.css:27)) are defined but never used. `react-markdown`, `remark-gfm`,
and `lucide-react` are in [package.json](../../package.json) but not used in shipped routes (the Now
ribbon strips `**` by hand instead of rendering markdown; icons are emoji, not lucide).
**Requirement:** Remove dead keyframes; either adopt `lucide-react` (see UX-13) or drop it; drop
`react-markdown`/`remark-gfm` unless a markdown surface is planned. Smaller bundle, less confusion.

---

## 6. Interaction, feedback & information architecture

### 🟡 UX-10 — Hydration flicker on card style & featured project
**Where:** [Dashboard.tsx:104-118](../../components/Dashboard.tsx:104). State defaults to
`style="calm"` and a server-computed `featured`, then a `useEffect` reads `localStorage` and may
switch both after mount. A "Bold" user sees Calm cards flash to Bold, and the featured project can
re-shuffle on every load.
**Requirement:** Avoid the post-hydration jump — read the preference before first paint (inline
script setting a `data-` attribute / cookie, or render the persisted choice server-side). At minimum,
suppress the cards' entrance animation until the persisted style is applied.

### 🟡 UX-11 — "Crown" affordance is hover-only and silent
**Where:** `.crown-btn` is greyed (`grayscale opacity .4`) until `:hover`
([globals.css:120](../../app/globals.css:120)); on touch there is no hover, so it reads as disabled.
On click it silently `scrollTo(top)` with no confirmation ([Dashboard.tsx:124](../../components/Dashboard.tsx:124)).
**Requirement:** Give the control a persistent (non-hover) resting state with a clear tooltip/label,
and confirm the action — a small toast ("Pinned *X* as most important") would reuse the already-defined
`toastpop` keyframe (ties off UX-09).

### 🟡 UX-12 — Misleading affordances & dead-end data
- **Areas** render with the `.calm` *card* styling but `cursor:default` and no link
  ([Dashboard.tsx:276](../../components/Dashboard.tsx:276)) — they look clickable but aren't, and
  there's no area route to go to.
- **Inbox / Resources / Archive** counts are tiny right-aligned text
  ([Dashboard.tsx:287](../../components/Dashboard.tsx:287)) — informative but easy to miss and not
  actionable.
**Requirement:** Visually distinguish non-interactive area tiles from clickable project cards (flat
style, no hover lift), or make them link somewhere real. Promote the inbox/resource/archive counts
into labeled stat chips if they matter, or de-emphasize consistently.

### 🟡 UX-13 — Emoji used as the icon system
**Where:** Throughout (`📋 ⏳ 👑 ✦ 📓 📷 🎯 🗺️ ✏️`). Emoji render differently per OS/browser,
can't inherit color/stroke, and some are announced verbosely by screen readers.
**Requirement:** Adopt the already-installed `lucide-react` for chrome/UI icons (keep emoji only
where they're decorative content). Consistent stroke weight + currentColor will also sharpen the
visual system.

### 🟡 UX-14 — Visual hierarchy leads with decoration
**Where:** The historical-figure banner is `min-height:256px`
([globals.css:47](../../app/globals.css:47)) and sits **above** the "Now" ribbon and the actual
work. For a tool whose value proposition is "what to work on now," the motivational decoration
currently outranks the answer.
**Requirement:** Consider making the banner collapsible/dismissible (persisted), or reduce its
default height and move "Now" above it. Validate with the user — this is a deliberate product
choice, not strictly a bug.

### ⚪ UX-15 — Hard text truncation can cut mid-word
**Where:** [Dashboard.tsx:135](../../components/Dashboard.tsx:135) — `nowLine` is `slice(0,240)` then
"…". Mid-word cuts read poorly.
**Requirement:** Truncate on a word boundary, or use CSS line-clamp so the full text remains in the
DOM (better for screen readers / copy).

---

## 7. Performance & perceived quality

### 🟠 UX-16 — Render-blocking font import + no font optimization
**Where:** [globals.css:2](../../app/globals.css:2) loads Spectral + DM Sans via Google Fonts
`@import` (render-blocking, FOUT, no `font-display` control). `next/font` is unused.
**Requirement:** Move both families to `next/font/google` in the layout (self-hosted, preloaded,
`display: swap`, zero layout shift). Removes a network round-trip on first paint.

### 🟠 UX-17 — Hotlinked, unsized, unoptimized imagery
**Where:** Raw `<img>` to Unsplash/Wikimedia in [view.ts](../../lib/view.ts:16),
[figures.ts](../../lib/figures.ts), and the `Img` helpers. No `width`/`height` (layout shift / CLS),
no responsive sizing, and reliability depends on external URLs — the code comment even admits IDs
were "verified to return 200 earlier this session," which is fragile.
**Requirement:** Use `next/image` with explicit dimensions and `remotePatterns` in
`next.config.mjs`, or download/vendor the assets locally. Keep the graceful gradient fallback for
errors. This improves LCP, removes CLS, and survives a dead URL.

---

## 8. Responsive / mobile *(verify in browser)*

Only a single breakpoint exists (`max-width:880px`, [globals.css:225](../../app/globals.css:225)).

- 🟡 **UX-18 — Banner cramps on phones.** A 122×152 portrait + a 23px italic quote + the absolutely
  positioned `.spark` button and `.b-scene-cap` share a 256px box; on narrow widths the spark button
  likely overlaps the caption. *Requirement:* add a small-screen banner layout (stack portrait above
  text, hide or reflow the caption, make `.spark` a normal-flow button under the text).
- 🟡 **UX-19 — Top bar / breadcrumb wrapping.** The top bar pills and the project breadcrumb are
  single-line flex rows with no wrap strategy; long project names or 3 pills will overflow on small
  screens. *Requirement:* allow wrap or truncate with ellipsis, and confirm tap targets are ≥44px.
- ⚪ **UX-20 — Only one breakpoint.** Consider a mid (tablet) step so the 352px focus column and the
  card grid transition more gracefully between 880px and desktop.

---

## 9. Prioritized backlog

| ID | Title | Severity | Effort | Area |
| --- | --- | --- | --- | --- |
| UX-01 | Keyboard-operable task checkboxes | 🔴 Critical | S | A11y |
| UX-02 | Global visible focus indicators | 🔴 Critical | S | A11y |
| UX-03 | Honor `prefers-reduced-motion` globally | 🟠 High | S | A11y |
| UX-04 | Fix `--ink-faint` contrast (AA) | 🟠 High | S | A11y |
| UX-05 | Un-nest crown button from card anchor | 🟠 High | M | A11y / HTML |
| UX-06 | Label icon-only controls / toggle state | 🟠 High | S | A11y |
| UX-08 | Resolve orphaned settings layer (wire up or remove) | 🟠 High | M–L | Capability |
| UX-16 | `next/font` for Spectral + DM Sans | 🟠 High | S | Perf |
| UX-17 | `next/image` + remote patterns for imagery | 🟠 High | M | Perf |
| UX-07 | Landmarks + skip link | 🟡 Med | S | A11y |
| UX-10 | Kill hydration flicker (style/featured) | 🟡 Med | M | Interaction |
| UX-11 | Persistent crown affordance + confirmation toast | 🟡 Med | S | Interaction |
| UX-12 | Fix misleading area tiles / dead-end counts | 🟡 Med | S | IA |
| UX-13 | Adopt lucide for UI icons | 🟡 Med | M | Design system |
| UX-14 | Rebalance banner vs "Now" hierarchy | 🟡 Med | S | IA |
| UX-18 | Mobile banner layout | 🟡 Med | M | Responsive |
| UX-19 | Top bar / breadcrumb wrap & tap targets | 🟡 Med | S | Responsive |
| UX-09 | Remove dead CSS / unused deps | ⚪ Low | S | Cleanup |
| UX-15 | Word-boundary truncation for Now line | ⚪ Low | S | Polish |
| UX-20 | Add a tablet breakpoint | ⚪ Low | S | Responsive |

**Suggested sprint 1 (quick wins, ~1 day):** UX-01, UX-02, UX-03, UX-04, UX-06, UX-16, UX-09.
These are mostly small CSS/markup edits and remove the worst accessibility and quality failures.

**Sprint 2:** UX-05, UX-17, UX-08, UX-10, UX-11, UX-12 — the structural and capability items.

---

## 10. Open questions / assumptions

1. **Settings layer intent** — was `lib/settings.ts` meant to ship (light mode etc.) or is it dead
   code from the de-Sovereign refactor? This decides UX-08 path A vs B.
2. **Banner prominence** — is the motivational figure a core part of the product feel, or
   secondary to "what to work on now"? Affects UX-14.
3. **Areas** — should area tiles be navigable (a future `/area/[slug]` route), or are they
   intentionally read-only summaries? Affects UX-12.
4. **Two card styles** — is Calm/Bold a feature worth the maintenance of two layouts, or could one
   refined style replace both?
5. A live pass against a real vault is recommended to confirm the responsive items (UX-18/19) and to
   capture before/after screenshots for sign-off.
