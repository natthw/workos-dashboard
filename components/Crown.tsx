// "Most important" marker — a gold star. (Was a crown; swapped to a star 2026-06-28
// because the crown drew too much attention.) Size + the bob/outline still come from
// .crown-badge / .crown-btn in globals.css; the `Crown` name and `.cr` class are kept
// so callers don't change.

export function Crown({ className = "", uid }: { className?: string; uid: string }) {
  const g = "cg" + uid;
  return (
    <svg
      className={`cr ${className}`}
      viewBox="0 0 64 56"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe07a" />
          <stop offset=".55" stopColor="#f0b53e" />
          <stop offset="1" stopColor="#d68f1f" />
        </linearGradient>
      </defs>
      {/* 5-pointed star, rounded joins (softer than a spiky star) */}
      <path
        d="M32 4 L37.9 20.9 L55.8 21.3 L41.5 32.1 L46.7 49.2 L32 39 L17.3 49.2 L22.5 32.1 L8.2 21.3 L26.1 20.9 Z"
        fill={`url(#${g})`}
        stroke="#b9781a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
