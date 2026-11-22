/* Tick: a cheerful orange clock whose hands keep turning (used by the loading screen). */
const INK = "#2B1111";

function Hand({ x, y, r = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <g fill="#fff" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        <rect x="-9" y="-19" width="5.5" height="12" rx="2.7" />
        <rect x="-3" y="-22" width="5.5" height="14" rx="2.7" />
        <rect x="3" y="-19" width="5.5" height="12" rx="2.7" />
        <ellipse cx="0" cy="0" rx="11" ry="10" />
      </g>
    </g>
  );
}

/* Tick: a cheerful orange clock whose hands keep turning. */
export function Tick({ size = 90, className = "", animate = true }) {
  return (
    <svg className={`tick ${animate ? "is-animated" : ""} ${className}`.trim()} width={(size * 120) / 150} height={size} viewBox="0 0 120 150" aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      <g className="tick__rays" stroke="#FFC400" strokeWidth="5" strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M60 4V16" transform={`rotate(${i * 30} 60 64)`} />
        ))}
      </g>
      <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round">
        <path d="M50 114 46 138" />
        <path d="M70 114 74 138" />
      </g>
      <ellipse cx="42" cy="142" rx="12" ry="6" fill="#fff" stroke={INK} strokeWidth="2.4" />
      <ellipse cx="78" cy="142" rx="12" ry="6" fill="#fff" stroke={INK} strokeWidth="2.4" />
      <circle cx="60" cy="64" r="46" fill="#F7941D" stroke={INK} strokeWidth="3" />
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round">
        {[0, 90, 180, 270].map((deg) => (
          <path key={deg} d="M60 24V32" transform={`rotate(${deg} 60 64)`} />
        ))}
      </g>
      <g className="tick__eyes">
        <ellipse cx="46" cy="60" rx="9" ry="12" fill="#FFF8EC" stroke={INK} strokeWidth="2" />
        <ellipse cx="74" cy="60" rx="9" ry="12" fill="#FFF8EC" stroke={INK} strokeWidth="2" />
        <ellipse cx="47" cy="62" rx="4" ry="7" fill={INK} />
        <ellipse cx="75" cy="62" rx="4" ry="7" fill={INK} />
        <path d="M36 50 31 46M38 47 35 41M84 50 89 46M82 47 85 41" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d="M44 78Q60 94 76 78Z" fill="#fff" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <g className="tick__hands" stroke={INK} strokeWidth="3.6" strokeLinecap="round">
        <path className="tick__min" d="M60 92 60 100" transform="translate(0 -28)" style={{ transformOrigin: "60px 64px" }} />
        <path className="tick__hour" d="M60 64 60 56" style={{ transformOrigin: "60px 64px" }} />
      </g>
      <circle cx="60" cy="64" r="3.4" fill={INK} />
      <path d="M103 74Q122 66 116 44" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <Hand x={116} y={40} r={-10} />
    </svg>
  );
}
