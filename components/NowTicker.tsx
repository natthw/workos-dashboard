// The "Now" focus line as a slow, sticky marquee pinned to the very top of the
// page. Two identical copies + translateX(-50%) give a seamless, gapless loop;
// it pauses on hover/focus and falls back to static text under reduced-motion
// (styling lives in `.now-ticker*` in globals.css). Presentational — no state.

function truncateWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

export function NowTicker({ focus }: { focus?: string }) {
  // First non-empty line, **bold** markers stripped, capped so the loop stays sane.
  const text = focus ? truncateWords(focus.split("\n")[0].replace(/\*\*/g, ""), 240) : "";
  if (!text) return null;

  return (
    <aside className="now-ticker" aria-label="Current focus">
      {/* full text, read once by screen readers; the visual marquee is aria-hidden */}
      <span className="vh">Now: {text}</span>
      <div className="now-ticker-label" aria-hidden="true">
        <span className="now-live" /> Now
      </div>
      <div className="now-ticker-viewport" aria-hidden="true">
        <div className="now-ticker-track">
          <span className="now-ticker-text">{text}<span className="now-sep">✦</span></span>
          <span className="now-ticker-text">{text}<span className="now-sep">✦</span></span>
        </div>
      </div>
    </aside>
  );
}
