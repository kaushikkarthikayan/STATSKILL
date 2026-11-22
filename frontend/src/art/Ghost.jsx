import { useEffect, useRef } from "react";
import { useMotion } from "../fx/motion.jsx";

/* Ghost: the figure from the reference sheet. A round head with dot eyes and a ragged, legless body.
   Every frame his joints ease toward the pose of the current mode, so he is always moving a little (breathing, swaying, blinking).
   modes: idle (cycles through the sheet's poses when auto), stand, chin, lean, tilt, hug, droop, shy, float,
          typing, think, talk, cheer, look.  With reduced motion he is drawn once and stays still. */
const INK = "#161616";
const AUTO = ["stand", "chin", "lean", "tilt", "hug", "droop", "shy", "float", "look", "chin"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function targets(mode, t, look) {
  const s = Math.sin;
  const b = { head: s(t * 1.2) * 3, body: s(t * 1.4) * 1.5, skew: s(t * 2.4) * 3, y: s(t * 2) * 2, sy: 1, aL: 10 + s(t * 1.7) * 4, aR: -10 - s(t * 1.7) * 4, mouth: 0, ex: look.x * 2.5, ey: look.y * 2 };
  switch (mode) {
    case "chin":
    case "think":
      return { ...b, head: -5, aR: 125 + s(t * 2) * 3, aL: 8, ex: -2, ey: -1.5 };
    case "lean":
      return { ...b, body: -11, head: 13, aR: -32, skew: 5 + s(t * 2) * 2 };
    case "tilt":
      return { ...b, head: 18 + s(t * 1.1) * 2, body: 4, aL: 20 };
    case "hug":
      return { ...b, sy: 0.8, y: 12, head: 15, aL: -95, aR: 95, skew: 0, ey: 3 };
    case "droop":
      return { ...b, head: 26 + s(t) * 2, body: 8, skew: 7, ey: 4, aL: 14, aR: -14 };
    case "shy":
      return { ...b, head: 12, aL: -45, aR: 45, body: s(t * 2) * 4, ey: 3 };
    case "float":
      return { ...b, y: -8 + s(t * 2.2) * 4, body: -14, skew: s(t * 5) * 7, aL: 50, aR: -50 };
    case "look":
      return { ...b, head: look.x * 12, ex: look.x * 3.5, ey: look.y * 3 };
    case "typing":
      return { ...b, head: 6, ey: 3, aL: -35 + s(t * 22) * 12, aR: 35 + s(t * 22 + 2) * 12 };
    case "talk":
      return { ...b, head: s(t * 3) * 5, aL: 35 + s(t * 4) * 14, aR: -35 + s(t * 5) * 14, mouth: 0.5 + Math.abs(s(t * 14)) * 0.5 };
    case "cheer": {
      const j = Math.abs(s(t * 6));
      return { ...b, y: -j * 7, aL: 150 + s(t * 12) * 8, aR: -150 - s(t * 12) * 8, mouth: 0.6 };
    }
    case "swoop":
      return { ...b, y: -4 + s(t * 3) * 3, body: -18, skew: s(t * 6) * 8, aL: 60, aR: -60, ex: -2 };
    default:
      return b;
  }
}

export default function Ghost({ mode = "idle", auto = false, size = 150, head = false, getLook, className = "", onClick }) {
  const { reduced } = useMotion();
  const refs = useRef({});
  const modeRef = useRef(mode);
  const lookRef = useRef({ x: 0, y: 0 });
  const root = useRef(null);
  modeRef.current = mode;
  const set = (name) => (el) => {
    refs.current[name] = el;
  };

  useEffect(() => {
    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const box = root.current?.getBoundingClientRect();
      if (!box) return;
      lookRef.current = { x: clamp((event.clientX - (box.left + box.width / 2)) / 260, -1, 1), y: clamp((event.clientY - (box.top + box.height * 0.3)) / 260, -1, 1) };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const cur = {};
    const start = performance.now();
    let frame = 0;
    let autoAt = 0;
    let autoIndex = 0;
    let autoMode = "stand";
    const apply = () => {
      const r = refs.current;
      const t = (performance.now() - start) / 1000;
      let m = modeRef.current;
      if (auto && m === "idle") {
        if (t > autoAt) {
          autoMode = AUTO[autoIndex++ % AUTO.length];
          autoAt = t + 3 + Math.random() * 2;
        }
        m = autoMode;
      }
      const g = targets(m, t, getLook ? getLook() : lookRef.current);
      const k = reduced ? 1 : 0.14;
      for (const key of Object.keys(g)) cur[key] = cur[key] === undefined ? g[key] : cur[key] + (g[key] - cur[key]) * k;
      r.root?.setAttribute("transform", `translate(0 ${cur.y.toFixed(2)})`);
      r.body?.setAttribute("transform", `translate(60 66) skewX(${cur.skew.toFixed(2)}) rotate(${cur.body.toFixed(2)}) scale(1 ${cur.sy.toFixed(3)}) translate(-60 -66)`);
      r.armL?.setAttribute("transform", `translate(46 78) rotate(${cur.aL.toFixed(1)})`);
      r.armR?.setAttribute("transform", `translate(74 78) rotate(${cur.aR.toFixed(1)})`);
      r.head?.setAttribute("transform", `translate(0 ${((1 - cur.sy) * 40).toFixed(1)}) rotate(${cur.head.toFixed(1)} 60 62)`);
      r.eyes?.setAttribute("transform", `translate(${cur.ex.toFixed(1)} ${cur.ey.toFixed(1)})`);
      const blink = t % 4.3 > 4.15 ? 0.1 : 1;
      r.eyeL?.setAttribute("transform", `translate(50 40) scale(1 ${blink}) translate(-50 -40)`);
      r.eyeR?.setAttribute("transform", `translate(70 40) scale(1 ${blink}) translate(-70 -40)`);
      if (r.mouth) {
        r.mouth.setAttribute("ry", (1 + cur.mouth * 5).toFixed(1));
        r.mouth.style.opacity = cur.mouth > 0.08 ? 1 : 0;
      }
      if (r.keys) r.keys.style.opacity = m === "typing" ? 1 : 0;
      if (r.dots) r.dots.style.opacity = m === "think" ? 1 : 0;
    };
    const tick = () => {
      apply();
      frame = requestAnimationFrame(tick);
    };
    apply();
    if (!reduced) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, auto, getLook]);

  const limb = { fill: "none", stroke: INK, strokeWidth: 3.8, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg
      ref={root}
      className={`ghost ${className}`.trim()}
      width={head ? size : (size * 120) / 150}
      height={head ? size : size}
      viewBox={head ? "26 8 68 62" : "0 0 120 150"}
      aria-hidden="true"
      focusable="false"
      onClick={onClick}
      style={{ overflow: head ? "hidden" : "visible" }}
    >
      <ellipse cx="60" cy="144" rx="28" ry="5" fill="rgba(0,0,0,.12)" />
      <g ref={set("root")}>
        <g ref={set("body")}>
          <path d="M44 68Q60 62 76 68L86 116 75 106 68 130 60 110 52 130 45 106 34 116Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <g ref={set("armL")}>
            <path d="M0 0V17" {...limb} />
          </g>
          <g ref={set("armR")}>
            <path d="M0 0V17" {...limb} />
          </g>
        </g>
        <g ref={set("keys")} style={{ opacity: 0 }}>
          <rect x="38" y="100" width="44" height="9" rx="3" fill="#fff" stroke="#9a9a9a" strokeWidth="2.4" />
        </g>
        <g ref={set("head")}>
          <ellipse cx="60" cy="40" rx="31" ry="28" fill="#fff" stroke={INK} strokeWidth="4" />
          <g ref={set("eyes")} fill={INK}>
            <ellipse ref={set("eyeL")} cx="50" cy="40" rx="2.8" ry="3.4" />
            <ellipse ref={set("eyeR")} cx="70" cy="40" rx="2.8" ry="3.4" />
            <ellipse ref={set("mouth")} cx="60" cy="53" rx="4" ry="1" style={{ opacity: 0 }} />
          </g>
          <g ref={set("dots")} fill={INK} style={{ opacity: 0 }}>
            <circle cx="98" cy="20" r="3" />
            <circle cx="106" cy="12" r="3.6" />
            <circle cx="116" cy="2" r="4.4" />
          </g>
        </g>
      </g>
    </svg>
  );
}
