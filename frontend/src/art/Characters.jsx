import Ghost from "./Ghost.jsx";

/* Avatar: a round cartoon face in a simple cartoon style. The ids match backend/app/services/options.py.
   Each id has its own body colour and mood, so every character looks different. */
const INK = "#2B1111";
const LOOKS = {
  scholar: { color: "#E8192C", mood: "happy" },
  captain: { color: "#F7941D", mood: "wow" },
  sprinter: { color: "#FFD60A", mood: "happy" },
  artist: { color: "#FF7EB6", mood: "cool" },
  dj: { color: "#A99BFF", mood: "happy" },
  cool: { color: "#4FC3F7", mood: "cool" },
  wizard: { color: "#6B46C1", mood: "think" },
  sunny: { color: "#FFB300", mood: "happy" },
  champ: { color: "#2EC4B6", mood: "wow" },
  ninja: { color: "#3A3A40", mood: "think" },
  robot: { color: "#9AA7B4", mood: "happy" },
  sprout: { color: "#5ED38A", mood: "happy" },
  kitty: { color: "#FF9F43", mood: "wow" },
};

export const AVATAR_IDS = Object.keys(LOOKS);

function Mouth({ mood }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 3.6, strokeLinecap: "round" };
  if (mood === "wow") return <ellipse cx="60" cy="86" rx="4.5" ry="6" fill={INK} />;
  if (mood === "think") return <path d="M52 86Q60 82 68 87" {...stroke} />;
  if (mood === "cool") return <path d="M50 83Q62 95 72 80" {...stroke} />;
  return <path d="M49 82Q60 98 71 82Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
}

export function Avatar({ id = "scholar", size = 96, bg = "#BDF700", bare = false, className = "", title }) {
  const look = LOOKS[id] || LOOKS.scholar;
  return (
    <svg
      className={`avatar ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {!bare && <circle cx="60" cy="60" r="56" fill={bg} stroke="#111" strokeWidth="4" />}
      <circle cx="60" cy="64" r="38" fill={look.color} stroke={INK} strokeWidth="3.5" />
      <path d="M33 50Q40 36 56 32" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity=".3" />
      <ellipse cx="47" cy="58" rx="11" ry="15" fill="#FFF8EC" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="73" cy="58" rx="11" ry="15" fill="#FFF8EC" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="48" cy="60" rx="5" ry="8.5" fill={INK} />
      <ellipse cx="74" cy="60" rx="5" ry="8.5" fill={INK} />
      <circle cx="49.6" cy="56" r="1.6" fill="#fff" />
      <circle cx="75.6" cy="56" r="1.6" fill="#fff" />
      <Mouth mood={look.mood} />
    </svg>
  );
}

/* The calm ghost figure used across the site. Old pose names map to his sheet poses. */
const GHOST_MODE = { wave: "stand", stand: "stand", cheer: "cheer", think: "think", shrug: "shy", read: "hug", flex: "lean", run: "float", point: "lean", sleep: "droop" };
export function Stickman({ pose = "wave", size = 150, className = "", title }) {
  return (
    <span className={className} role={title ? "img" : undefined} aria-label={title} style={{ display: "inline-block" }}>
      <Ghost mode={GHOST_MODE[pose] || "stand"} auto={pose === "wave" || pose === "stand"} size={size} />
    </span>
  );
}
