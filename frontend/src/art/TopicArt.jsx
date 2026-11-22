/* Illustrations for course topics and achievement badges.
   Topics are added by staff at any time, so a picture is chosen from the topic's name, and
   `assignTopicArt` makes sure the topics of one course get different pictures. */
const INK = "#111";
const S = { stroke: INK, strokeWidth: 3.5, strokeLinecap: "round", strokeLinejoin: "round" };

const SCENES = {
  bars: () => (
    <>
      <rect x="22" y="58" width="22" height="38" rx="4" fill="#FFD60A" {...S} />
      <rect x="52" y="38" width="22" height="58" rx="4" fill="#4FC3F7" {...S} />
      <rect x="82" y="22" width="22" height="74" rx="4" fill="#FF7EB6" {...S} />
      <rect x="112" y="46" width="22" height="50" rx="4" fill="#5ED38A" {...S} />
      <path d="M14 100H146" fill="none" {...S} />
    </>
  ),
  bell: () => (
    <>
      <path d="M14 94C40 94 52 18 80 18s40 76 66 76Z" fill="#A99BFF" {...S} />
      <path d="M80 18V94" fill="none" {...S} strokeDasharray="2 8" />
      <path d="M10 94H150" fill="none" {...S} />
      <circle cx="56" cy="80" r="4" fill="#fff" {...S} strokeWidth="2.5" />
      <circle cx="80" cy="60" r="4" fill="#fff" {...S} strokeWidth="2.5" />
      <circle cx="104" cy="80" r="4" fill="#fff" {...S} strokeWidth="2.5" />
    </>
  ),
  dice: () => (
    <>
      <g transform="rotate(-12 56 62)">
        <rect x="30" y="36" width="52" height="52" rx="11" fill="#fff" {...S} />
        <circle cx="44" cy="50" r="4.5" fill={INK} />
        <circle cx="56" cy="62" r="4.5" fill={INK} />
        <circle cx="68" cy="74" r="4.5" fill={INK} />
      </g>
      <g transform="rotate(14 108 58)">
        <rect x="84" y="32" width="52" height="52" rx="11" fill="#FFD60A" {...S} />
        <circle cx="98" cy="46" r="4.5" fill={INK} />
        <circle cx="122" cy="46" r="4.5" fill={INK} />
        <circle cx="110" cy="58" r="4.5" fill={INK} />
        <circle cx="98" cy="70" r="4.5" fill={INK} />
        <circle cx="122" cy="70" r="4.5" fill={INK} />
      </g>
    </>
  ),
  scatter: () => (
    <>
      <path d="M22 14V94H148" fill="none" {...S} />
      <path d="M30 84 136 28" fill="none" stroke="#FF5252" strokeWidth="4" strokeLinecap="round" />
      {[
        [40, 72, "#4FC3F7"],
        [56, 78, "#FFD60A"],
        [66, 56, "#FF7EB6"],
        [84, 62, "#5ED38A"],
        [96, 40, "#4FC3F7"],
        [112, 46, "#FFD60A"],
        [126, 26, "#FF7EB6"],
      ].map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6.5" fill={c} {...S} strokeWidth="3" />
      ))}
    </>
  ),
  pie: () => (
    <>
      <circle cx="62" cy="58" r="36" fill="#4FC3F7" {...S} />
      <path d="M62 58V22A36 36 0 0 1 96 46Z" fill="#FFD60A" {...S} transform="translate(4 -4)" />
      <path d="M62 58 96 46A36 36 0 0 1 82 90Z" fill="#FF7EB6" {...S} />
      <rect x="112" y="30" width="14" height="10" rx="3" fill="#FFD60A" {...S} strokeWidth="3" />
      <rect x="112" y="52" width="14" height="10" rx="3" fill="#FF7EB6" {...S} strokeWidth="3" />
      <rect x="112" y="74" width="14" height="10" rx="3" fill="#4FC3F7" {...S} strokeWidth="3" />
    </>
  ),
  magnifier: () => (
    <>
      <rect x="24" y="14" width="68" height="86" rx="8" fill="#fff" {...S} />
      <path d="M36 34h44M36 48h30M36 62h40M36 76h24" fill="none" {...S} strokeWidth="3" />
      <circle cx="94" cy="56" r="26" fill="rgba(79,195,247,.45)" {...S} />
      <path d="M113 76 136 100" fill="none" stroke="#8B5A2B" strokeWidth="9" strokeLinecap="round" />
      <path d="M113 76 136 100" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" />
    </>
  ),
  flask: () => (
    <>
      <path d="M64 12H96M72 12V44L46 88Q42 98 54 98H106Q118 98 114 88L88 44V12" fill="#E8F7FF" {...S} />
      <path d="M56 78H104L114 88Q118 98 106 98H54Q42 98 46 88Z" fill="#5ED38A" {...S} />
      <circle cx="72" cy="66" r="4" fill="#fff" {...S} strokeWidth="2.5" />
      <circle cx="90" cy="56" r="3" fill="#fff" {...S} strokeWidth="2.5" />
      <circle cx="84" cy="34" r="3" fill="#fff" {...S} strokeWidth="2.5" />
    </>
  ),
  calc: () => (
    <>
      <rect x="48" y="8" width="64" height="96" rx="11" fill="#FF9F43" {...S} />
      <rect x="57" y="17" width="46" height="22" rx="5" fill="#fff" {...S} />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => <circle key={`${row}${col}`} cx={64 + col * 16} cy={54 + row * 17} r="5.5" fill="#FFF3DD" {...S} strokeWidth="3" />)
      )}
    </>
  ),
  books: () => (
    <>
      <rect x="26" y="74" width="104" height="22" rx="5" fill="#FF7EB6" {...S} />
      <rect x="38" y="50" width="88" height="22" rx="5" fill="#4FC3F7" {...S} />
      <rect x="20" y="26" width="94" height="22" rx="5" fill="#FFD60A" {...S} />
      <path d="M38 74v22M48 74v22M52 50v22M62 50v22M34 26v22M44 26v22" fill="none" {...S} strokeWidth="3" />
    </>
  ),
  bulb: () => (
    <>
      <path d="M80 6V0M34 30l-8-4M126 30l8-4M24 56H12M148 56h-12" fill="none" {...S} />
      <circle cx="80" cy="50" r="30" fill="#FFF176" {...S} />
      <path d="M70 52l10 12 10-12" fill="none" {...S} strokeWidth="3" />
      <rect x="66" y="78" width="28" height="9" rx="4" fill="#C9CED6" {...S} />
      <rect x="69" y="89" width="22" height="9" rx="4" fill="#C9CED6" {...S} />
    </>
  ),
  rocket: () => (
    <>
      <path d="M80 8C102 26 108 58 98 84H62C52 58 58 26 80 8Z" fill="#fff" {...S} />
      <circle cx="80" cy="44" r="11" fill="#4FC3F7" {...S} />
      <path d="M64 64 44 88 64 82ZM96 64l20 24-20-6Z" fill="#FF5252" {...S} />
      <path d="M72 86Q80 112 88 86Z" fill="#FF9F43" {...S} />
      <path d="M26 24l4 8 8 4-8 4-4 8-4-8-8-4 8-4ZM130 54l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#FFD60A" {...S} strokeWidth="2.5" />
    </>
  ),
  puzzle: () => (
    <>
      <path d="M24 28H62V38A9 9 0 1 1 62 56V74H24Z" fill="#5ED38A" {...S} />
      <path d="M72 40H110V50A9 9 0 1 0 110 68V86H72Z" fill="#FF7EB6" {...S} transform="translate(8 6)" />
    </>
  ),
  globe: () => (
    <>
      <circle cx="80" cy="56" r="40" fill="#4FC3F7" {...S} />
      <path d="M52 40Q66 28 78 40T72 62Q60 66 54 58ZM88 62Q104 54 110 68Q104 84 90 80Z" fill="#5ED38A" {...S} strokeWidth="3" />
      <ellipse cx="80" cy="56" rx="16" ry="40" fill="none" {...S} strokeWidth="2.5" />
      <circle cx="68" cy="50" r="3.5" fill="#FF5252" />
      <circle cx="96" cy="44" r="3.5" fill="#FF5252" />
      <circle cx="84" cy="72" r="3.5" fill="#FF5252" />
    </>
  ),
  target: () => (
    <>
      <circle cx="70" cy="58" r="40" fill="#fff" {...S} />
      <circle cx="70" cy="58" r="29" fill="#FF5252" {...S} />
      <circle cx="70" cy="58" r="18" fill="#fff" {...S} />
      <circle cx="70" cy="58" r="7" fill="#FF5252" {...S} />
      <path d="M72 56 128 14M118 12l12 2-2 12" fill="none" {...S} strokeWidth="4" />
    </>
  ),
  table: () => (
    <>
      <rect x="20" y="16" width="120" height="80" rx="7" fill="#fff" {...S} />
      <path d="M20 22a6 6 0 0 1 6-6h108a6 6 0 0 1 6 6v14H20Z" fill="#5ED38A" {...S} />
      <path d="M60 36v60M100 36v60M20 56h120M20 76h120" fill="none" {...S} strokeWidth="3" />
    </>
  ),
  check: () => (
    <>
      <rect x="40" y="12" width="80" height="96" rx="9" fill="#fff" {...S} />
      <rect x="62" y="6" width="36" height="14" rx="6" fill="#FFD60A" {...S} />
      <path d="M54 40l6 6 11-12M54 64l6 6 11-12M54 88l6 6 11-12" fill="none" stroke="#2E9E4F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M80 42h28M80 66h28M80 90h28" fill="none" {...S} strokeWidth="3" />
    </>
  ),
};

const BACKGROUNDS = ["#FFF1B8", "#D6F1FF", "#FFD9E8", "#DDF7D3", "#E7E1FF", "#FFE2C2"];

/* Keyword -> picture. The first rule that matches the topic name wins. */
const RULES = [
  [/descript|summar|central|average|mean|measure/i, "bars"],
  [/probab|chance|random|odds|dice/i, "dice"],
  [/distribut|normal|gauss|bell|curve/i, "bell"],
  [/regress|correl|relationship|scatter|model/i, "scatter"],
  [/hypothes|signific|infer|p-value|confidence/i, "flask"],
  [/sampl|population|survey|census/i, "globe"],
  [/data|table|clean|wrangl|spreadsheet/i, "table"],
  [/visual|chart|graph|plot/i, "pie"],
  [/machine|learn|predict|forecast|\bai\b/i, "rocket"],
  [/intro|basic|fundament|foundation|overview/i, "books"],
  [/math|calcul|formula|equation|algebra|number/i, "calc"],
  [/experiment|design|method|research/i, "magnifier"],
  [/skill|practice|goal|target|aim/i, "target"],
  [/review|check|quiz|assess/i, "check"],
];
const ORDER = Object.keys(SCENES);

/* topics: [{ id, name }] -> { [topicId]: sceneKey }, different pictures for different topics (while pictures last). */
export function assignTopicArt(topics) {
  const used = new Set();
  const result = {};
  for (const topic of topics) {
    const rule = RULES.find(([pattern]) => pattern.test(`${topic.name} ${topic.skill_area || ""}`));
    if (rule && !used.has(rule[1])) {
      result[topic.id] = rule[1];
      used.add(rule[1]);
    }
  }
  let cursor = 0;
  for (const topic of topics) {
    if (result[topic.id]) continue;
    let guard = 0;
    while (used.has(ORDER[cursor % ORDER.length]) && guard < ORDER.length) {
      cursor += 1;
      guard += 1;
    }
    result[topic.id] = ORDER[cursor % ORDER.length];
    used.add(result[topic.id]);
    cursor += 1;
  }
  return result;
}

export function artKeyFor(name = "", id = 0) {
  const rule = RULES.find(([pattern]) => pattern.test(name));
  return rule ? rule[1] : ORDER[Math.abs(Number(id) || 0) % ORDER.length];
}

export function TopicArt({ kind = "bars", size = 140, tint, className = "" }) {
  const Scene = SCENES[kind] || SCENES.bars;
  const bg = tint || BACKGROUNDS[ORDER.indexOf(kind) % BACKGROUNDS.length];
  return (
    <svg
      className={`topic-art ${className}`.trim()}
      width={size}
      height={(size * 110) / 160}
      viewBox="0 0 160 110"
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
    >
      <path d="M14 56C10 26 40 6 80 8s68 18 66 48-30 50-68 48S18 86 14 56Z" fill={bg} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <g transform="translate(8 4) scale(.9)">
        <Scene />
      </g>
    </svg>
  );
}

/* ---------- achievement badges (80 x 80) ---------- */
const BADGES = {
  "first-steps": { bg: "#BDF700", art: <path d="M28 62V20M28 22h26l-6 9 6 9H28" fill="#FF5252" stroke={INK} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /> },
  "perfect-score": {
    bg: "#FFD60A",
    art: (
      <>
        <circle cx="40" cy="40" r="22" fill="#fff" stroke={INK} strokeWidth="4" />
        <circle cx="40" cy="40" r="13" fill="#FF5252" stroke={INK} strokeWidth="4" />
        <circle cx="40" cy="40" r="4.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
      </>
    ),
  },
  "sharp-shooter": {
    bg: "#4FC3F7",
    art: (
      <>
        <circle cx="40" cy="40" r="19" fill="none" stroke={INK} strokeWidth="4" />
        <path d="M40 14v14M40 52v14M14 40h14M52 40h14" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <circle cx="40" cy="40" r="3.5" fill="#FF5252" />
      </>
    ),
  },
  "topic-master": {
    bg: "#FF7EB6",
    art: (
      <>
        <path d="M18 34c8-4 16-4 22 2 6-6 14-6 22-2v26c-8-4-16-4-22 2-6-6-14-6-22-2Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M40 36v26" stroke={INK} strokeWidth="3.5" />
        <polygon points="40,10 44,19 54,20 46.5,26.5 48.7,36 40,31 31.3,36 33.5,26.5 26,20 36,19" fill="#FFD60A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      </>
    ),
  },
  "course-champion": {
    bg: "#A99BFF",
    art: (
      <>
        <path d="M24 16h32v16a16 16 0 0 1-32 0Z" fill="#FFD60A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M24 22H14c0 10 4 16 12 18M56 22h10c0 10-4 16-12 18" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M40 48v10M28 64h24" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </>
    ),
  },
  bookworm: {
    bg: "#5ED38A",
    art: (
      <>
        <rect x="14" y="44" width="52" height="16" rx="4" fill="#fff" stroke={INK} strokeWidth="4" />
        <path d="M22 44c0-14 10-22 20-16s6 16 14 10" fill="none" stroke="#2E9E4F" strokeWidth="9" strokeLinecap="round" />
        <path d="M22 44c0-14 10-22 20-16s6 16 14 10" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 11" />
        <circle cx="58" cy="37" r="3.2" fill={INK} />
      </>
    ),
  },
  comeback: {
    bg: "#FF9F43",
    art: <path d="M14 56 30 40l10 8 24-26M50 22h14v14" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  "on-a-roll": {
    bg: "#FF5252",
    art: (
      <>
        <path d="M40 10C44 24 58 28 58 46a18 18 0 0 1-36 0c0-10 6-14 8-22 4 4 6 8 6 12 4-6 4-14 4-26Z" fill="#FFD60A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M40 40c3 6 8 8 8 14a8 8 0 0 1-16 0c0-4 4-6 8-14Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      </>
    ),
  },
};

export function BadgeArt({ id, earned = true, size = 84 }) {
  const badge = BADGES[id] || BADGES["first-steps"];
  return (
    <svg
      className={`badge-art ${earned ? "is-earned" : "is-locked"}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
    >
      <circle cx="40" cy="40" r="37" fill={earned ? badge.bg : "#DAD6CB"} stroke={INK} strokeWidth="4" />
      <g opacity={earned ? 1 : 0.35}>{badge.art}</g>
      {!earned && (
        <g transform="translate(46 46)">
          <rect x="0" y="9" width="24" height="18" rx="4" fill="#fff" stroke={INK} strokeWidth="3.5" />
          <path d="M5 9V6a7 7 0 0 1 14 0v3" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
