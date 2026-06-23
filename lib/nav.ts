/**
 * Signal the global navigation overlay (components/NavigationProgress.tsx) that
 * a client-side route change is starting. Call this immediately before a
 * programmatic `router.push(...)` — Next fires its navigation/URL-commit events
 * only once the destination content is ready, so the click/keypress that starts
 * the navigation is the real "loading started" moment.
 *
 * Plain <Link>/<a> clicks are detected automatically by the overlay; this is
 * only needed for router.push() call sites (spotlight, nav keys, palette).
 */
export function startNavProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("realm:nav-start"));
  }
}
