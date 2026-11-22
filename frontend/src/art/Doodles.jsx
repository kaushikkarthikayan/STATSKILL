/* Small hand-drawn decorations. They float gently and are always hidden from screen readers. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 3.2, strokeLinecap: "round", strokeLinejoin: "round" };

const SHAPES = {
  star: <path d="M20 4l4.6 10.2 11 1.2-8.2 7.4 2.4 10.9L20 27.8 10.2 33.7l2.4-10.9L4.4 15.4l11-1.2Z" {...S} />,
  squiggle: <path d="M3 22q6-14 12 0t12 0 12 0" {...S} />,
  spiral: <path d="M20 20m0 0a3 3 0 1 1 3 3 6 6 0 1 1-6-6 9 9 0 1 1 9 9 12 12 0 1 1-12-12" {...S} />,
  arrow: <path d="M4 26C14 6 26 6 34 20M34 20l-9-2M34 20l-2-9" {...S} />,
  heart: <path d="M20 33S5 24 5 14a8 8 0 0 1 15-3 8 8 0 0 1 15 3c0 10-15 19-15 19Z" {...S} />,
  bolt: <path d="M23 3 9 22h10l-3 15L31 17H21Z" {...S} />,
  sparkle: <path d="M20 3c1 9 4 12 14 14-10 2-13 5-14 14-1-9-4-12-14-14 10-2 13-5 14-14Z" {...S} />,
  cloud: <path d="M10 28a7 7 0 0 1 0-14 10 10 0 0 1 19-2 8 8 0 0 1 1 16Z" {...S} />,
  zigzag: <path d="M3 28 11 12l8 16 8-16 8 16" {...S} />,
  scribble: <path d="M5 28 33 8M5 20 27 4M11 33 36 14M17 36 37 22" {...S} />,
  plus: <path d="M20 6v28M6 20h28" {...S} />,
  question: <path d="M13 14a7 7 0 1 1 10 6c-3 2-3 4-3 6M20 33v.5" {...S} />,
  pencil: <path d="M7 33l2-8L28 6l6 6L15 31ZM24 10l6 6" {...S} />,
  book: <path d="M5 8c6-3 11-3 15 1 4-4 9-4 15-1v22c-6-3-11-3-15 1-4-4-9-4-15-1Z M20 9v22" {...S} />,
  bulb: <path d="M14 27h12M16 32h8M20 3a11 11 0 0 0-6 20c1 1 1 2 1 4h10c0-2 0-3 1-4A11 11 0 0 0 20 3Z" {...S} />,
  flag: <path d="M9 36V5M9 6h22l-5 7 5 7H9" {...S} />,
  music: <path d="M14 29V8l16-4v21M14 29a4 4 0 1 1-4-4M30 25a4 4 0 1 1-4-4" {...S} />,
  check: <path d="M6 21l9 9L34 9" {...S} />,
  circle: <path d="M20 5C9 4 3 13 5 23s13 14 22 9 10-17 3-24S12 2 11 8" {...S} />,
  dots: (
    <g fill="currentColor">
      <circle cx="8" cy="10" r="3" />
      <circle cx="22" cy="6" r="3" />
      <circle cx="31" cy="20" r="3" />
      <circle cx="14" cy="28" r="3" />
    </g>
  ),
};

export function Doodle({ name = "star", size = 40, color = "currentColor", className = "", style }) {
  return (
    <svg className={`doodle ${className}`.trim()} width={size} height={size} viewBox="0 0 40 40" style={{ color, ...style }} aria-hidden="true" focusable="false">
      {SHAPES[name] || SHAPES.star}
    </svg>
  );
}

/* Places doodles at fixed spots inside a positioned parent. items: [{ name, x, y, size, rot, color, delay }] (x and y are percentages) */
export function DoodleField({ items, className = "" }) {
  return (
    <div className={`doodle-field ${className}`.trim()} aria-hidden="true">
      {items.map((item, i) => (
        <span
          className="doodle-field__item"
          key={i}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            "--rot": `${item.rot || 0}deg`,
            "--delay": `${item.delay ?? (i % 5) * -1.1}s`,
            "--dur": `${5 + (i % 4)}s`,
          }}
        >
          <Doodle name={item.name} size={item.size || 36} color={item.color} />
        </span>
      ))}
    </div>
  );
}

/* Ready-made layouts so every page has its own mood. */
export const DOODLES = {
  dashboard: [
    { name: "star", x: 4, y: 10, size: 34, rot: -12, color: "#FF9F43" },
    { name: "squiggle", x: 88, y: 6, size: 54, rot: 8, color: "#4FC3F7" },
    { name: "sparkle", x: 93, y: 62, size: 36, rot: 0, color: "#FF7EB6" },
    { name: "spiral", x: 2, y: 70, size: 40, rot: 10, color: "#A99BFF" },
    { name: "plus", x: 47, y: 3, size: 24, rot: 14, color: "#0B0B0B" },
  ],
  training: [
    { name: "flag", x: 3, y: 8, size: 38, rot: -8, color: "#FF5252" },
    { name: "bulb", x: 92, y: 8, size: 40, rot: 10, color: "#FFC400" },
    { name: "star", x: 6, y: 74, size: 30, rot: 12, color: "#A99BFF" },
  ],
  profile: [
    { name: "heart", x: 4, y: 12, size: 34, rot: -10, color: "#FF7EB6" },
    { name: "pencil", x: 91, y: 10, size: 42, rot: 12, color: "#FF9F43" },
    { name: "sparkle", x: 94, y: 72, size: 34, rot: 0, color: "#5ED38A" },
    { name: "music", x: 3, y: 76, size: 34, rot: 8, color: "#4FC3F7" },
  ],
  report: [
    { name: "bolt", x: 4, y: 8, size: 36, rot: -8, color: "#FFC400" },
    { name: "check", x: 92, y: 8, size: 36, rot: 8, color: "#5ED38A" },
    { name: "zigzag", x: 90, y: 74, size: 50, rot: -6, color: "#FF7EB6" },
    { name: "dots", x: 3, y: 72, size: 30, rot: 0, color: "#A99BFF" },
  ],
  test: [
    { name: "question", x: 4, y: 10, size: 36, rot: -10, color: "#A99BFF" },
    { name: "star", x: 92, y: 12, size: 32, rot: 10, color: "#FFC400" },
    { name: "scribble", x: 90, y: 72, size: 40, rot: 0, color: "#4FC3F7" },
  ],
  about: [
    { name: "star", x: 6, y: 6, size: 34, rot: -10, color: "#FFD60A" },
    { name: "sparkle", x: 92, y: 8, size: 40, rot: 12, color: "#FFFFFF" },
    { name: "heart", x: 4, y: 82, size: 34, rot: -8, color: "#FF7EB6" },
    { name: "bolt", x: 94, y: 80, size: 36, rot: 8, color: "#FFFFFF" },
    { name: "squiggle", x: 48, y: 2, size: 50, rot: 0, color: "#FFFFFF" },
  ],
  welcome: [
    { name: "star", x: 8, y: 22, size: 38, rot: -12, color: "#0B3A0A" },
    { name: "squiggle", x: 80, y: 14, size: 60, rot: 8, color: "#0B3A0A" },
    { name: "sparkle", x: 90, y: 50, size: 40, rot: 0, color: "#FFFFFF" },
    { name: "spiral", x: 4, y: 58, size: 44, rot: 10, color: "#0B3A0A" },
    { name: "plus", x: 24, y: 8, size: 26, rot: 14, color: "#0B3A0A" },
    { name: "heart", x: 70, y: 66, size: 34, rot: -8, color: "#FF7EB6" },
  ],
};
