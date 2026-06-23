// Gold crown, recreated as an inline SVG (from the Claude Design assets/crown.png),
// with the source's bobbing animation + white outline applied via the .crown-badge class.

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
      <path
        d="M5 41 L9.5 17 Q9.7 14.5 11.6 16.2 L22 28 L30.2 8.5 Q32 4.8 33.8 8.5 L42 28 L52.4 16.2 Q54.3 14.5 54.5 17 L59 41 Z"
        fill={`url(#${g})`}
        stroke="#b9781a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <rect x="6.5" y="41" width="51" height="10.5" rx="3" fill={`url(#${g})`} stroke="#b9781a" strokeWidth="1.3" />
      <circle cx="10.7" cy="15.5" r="2.6" fill="#ff8a5b" stroke="#fff" strokeWidth="1" />
      <circle cx="32" cy="7.2" r="3" fill="#7fd1c0" stroke="#fff" strokeWidth="1" />
      <circle cx="53.3" cy="15.5" r="2.6" fill="#ff8a5b" stroke="#fff" strokeWidth="1" />
      <circle cx="32" cy="46.3" r="3.2" fill="#e0556a" stroke="#fff" strokeWidth="1.1" />
      <circle cx="20" cy="46.3" r="2" fill="#fff" opacity=".75" />
      <circle cx="44" cy="46.3" r="2" fill="#fff" opacity=".75" />
    </svg>
  );
}
