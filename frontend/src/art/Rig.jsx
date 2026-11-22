import { useEffect, useRef } from "react";
import { useMotion } from "../fx/motion.jsx";

/* Rig: a hand-drawn stick figure with real joints (shoulders, elbows, hips, knees) that is animated every frame.
   Loop hands and feet, round head, dot eyes. modes: idle, look, walk, wave, cheer, dance, typing, think, talk.
   Joint angles ease toward the target of the current mode, so changing mode flows instead of snapping.
   With reduced motion the figure is drawn once, standing still. */
const INK = "#161616";
const AUTO = ["idle", "look", "wave", "lean", "sit", "think", "dance", "shy", "hug", "droop", "look"];
const rad = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* target joint angles (degrees) for a mode at time t (seconds); look = pointer direction -1..1 */
function targets(mode, t, look) {
  const s = Math.sin;
  const base = { head: s(t * 1.3) * 3, body: 0, y: s(t * 2.2) * 1.2, aL1: 8 + s(t * 1.6) * 3, aL2: 6, aR1: -8 - s(t * 1.6) * 3, aR2: -6, lL1: 0, lL2: 0, lR1: 0, lR2: 0, mouth: 0, ex: look.x * 2.5, ey: look.y * 2 };
  switch (mode) {
    case "look":
      return { ...base, head: look.x * 12, ex: look.x * 3.5, ey: look.y * 3 };
    case "walk": {
      const p = t * 7.5;
      return { ...base, y: -Math.abs(s(p)) * 3.5, body: s(p) * 3, head: s(p * 0.5) * 2, aL1: s(p) * 30, aL2: 12 + Math.max(0, s(p)) * 18, aR1: -s(p) * 30, aR2: -12 - Math.max(0, -s(p)) * 18, lL1: s(p) * 30, lL2: Math.max(0, -s(p + 1)) * 38, lR1: -s(p) * 30, lR2: Math.max(0, s(p + 1)) * 38 };
    }
    case "wave":
      return { ...base, head: 5, aR1: -150 + s(t * 2) * 4, aR2: s(t * 11) * 28, ex: 1.5 };
    case "cheer": {
      const j = Math.abs(s(t * 7));
      return { ...base, y: -j * 16, aL1: 150 + s(t * 14) * 8, aR1: -150 - s(t * 14) * 8, aL2: 8, aR2: -8, lL1: 8, lR1: -8, lL2: j * 20, lR2: j * 20, mouth: 0.7 };
    }
    case "dance": {
      const p = t * 6;
      return { ...base, y: -Math.abs(s(p)) * 5, body: s(p) * 9, head: s(p + 1) * 10, aL1: 80 + s(p) * 55, aR1: -80 + s(p + 2) * 55, aL2: s(p * 2) * 25, aR2: s(p * 2) * 25, lL1: s(p) * 16, lR1: s(p + 3) * 16, lL2: Math.max(0, s(p)) * 24, lR2: Math.max(0, s(p + 3)) * 24, mouth: 0.4 };
    }
    case "typing":
      return { ...base, head: 6, ey: 3, y: 0, aL1: -18 + s(t * 22) * 6, aL2: -62 + s(t * 22) * 10, aR1: 18 + s(t * 22 + 2) * 6, aR2: 62 + s(t * 22 + 2) * 10 };
    case "think":
      return { ...base, head: -6 + s(t * 1.6) * 3, aR1: -45, aR2: 150, ex: -2.5, ey: -2 };
    case "hang":
      return { ...base, y: 0, head: -4, ey: -2.5, aL1: 168, aR1: -168, aL2: 4, aR2: -4, lL1: s(t * 2.4) * 10, lR1: -s(t * 2.4 + 1) * 10, lL2: 8 + s(t * 2.4) * 8, lR2: 8 - s(t * 2.4 + 1) * 8 };
    case "fall": {
      const f = t * 16;
      return { ...base, y: 0, head: s(f) * 8, ey: 2, mouth: 1, aL1: 120 + s(f) * 40, aR1: -(120 + s(f + 2) * 40), aL2: s(f * 1.3) * 25, aR2: s(f * 1.3) * 25, lL1: s(f) * 40, lR1: -s(f) * 40, lL2: 25, lR2: 25 };
    }
    case "sit":
      return { ...base, y: 22, head: s(t * 1.1) * 4, lL1: -85, lL2: -85, lR1: -85, lR2: -85, aL1: 30, aL2: -40, aR1: -50, aR2: -20, ey: 1 };
    case "hug":
      return { ...base, y: 22, head: 10 + s(t * 1.1) * 3, ey: 3, lL1: -85, lL2: -85, lR1: -85, lR2: -85, aL1: -75, aL2: -35, aR1: -85, aR2: -25 };
    case "lean":
      return { ...base, body: -11 + s(t * 1.2) * 2, head: 12 + s(t * 1.4) * 3, aL1: 16, aR1: -34, aR2: -20, lL1: 9, lR1: -17, ex: 2 };
    case "droop":
      return { ...base, body: 6, head: 20 + s(t * 0.9) * 3, ey: 4.5, y: 3 + s(t * 1.6), aL1: 14, aL2: 12, aR1: -14, aR2: -12 };
    case "shy":
      return { ...base, head: 14 + s(t * 2) * 3, ey: 3, aL1: -24, aL2: -40, aR1: 24, aR2: 40, lR1: -s(t * 3.2) * 12, lR2: Math.max(0, s(t * 3.2)) * 20 };
    case "talk":
      return { ...base, head: s(t * 3) * 5, aL1: 30 + s(t * 4) * 14, aL2: 16, aR1: -40 + s(t * 5) * 18, aR2: -34, mouth: 0.45 + Math.abs(s(t * 14)) * 0.55 };
    default:
      return base;
  }
}

export default function Rig({ mode = "idle", auto = false, size = 150, head = false, onMode, getLook, className = "", onClick }) {
  const { reduced } = useMotion();
  const refs = useRef({});
  const modeRef = useRef(mode);
  const lookRef = useRef({ x: 0, y: 0 });
  const root = useRef(null);
  modeRef.current = mode;
  const set = (name) => (el) => {
    refs.current[name] = el;
  };

  // pointer direction (for the eyes and head)
  useEffect(() => {
    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const box = root.current?.getBoundingClientRect();
      if (!box) return;
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height * 0.3);
      lookRef.current = { x: clamp(dx / 260, -1, 1), y: clamp(dy / 260, -1, 1) };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const cur = {};
    let frame = 0;
    let last = performance.now();
    let autoAt = 0;
    let autoIndex = 0;
    let autoMode = "idle";
    const start = last;
    const apply = () => {
      const r = refs.current;
      const t = (performance.now() - start) / 1000;
      let m = modeRef.current;
      if (auto && m === "idle") {
        if (t > autoAt) {
          autoMode = AUTO[autoIndex++ % AUTO.length];
          autoAt = t + 2.6 + Math.random() * 2;
        }
        m = autoMode;
      }
      const look = getLook ? getLook() : lookRef.current;
      const g = targets(m, t, look);
      const k = reduced ? 1 : 0.16;
      for (const key of Object.keys(g)) cur[key] = cur[key] === undefined ? g[key] : cur[key] + (g[key] - cur[key]) * k;
      r.root?.setAttribute("transform", `translate(0 ${cur.y.toFixed(2)}) rotate(${cur.body.toFixed(2)} 60 110)`);
      r.armL?.setAttribute("transform", `translate(50 74) rotate(${cur.aL1.toFixed(1)})`);
      r.foreL?.setAttribute("transform", `translate(0 20) rotate(${cur.aL2.toFixed(1)})`);
      r.armR?.setAttribute("transform", `translate(70 74) rotate(${cur.aR1.toFixed(1)})`);
      r.foreR?.setAttribute("transform", `translate(0 20) rotate(${cur.aR2.toFixed(1)})`);
      r.legL?.setAttribute("transform", `translate(54 106) rotate(${cur.lL1.toFixed(1)})`);
      r.kneeL?.setAttribute("transform", `translate(0 22) rotate(${(-cur.lL2).toFixed(1)})`);
      r.legR?.setAttribute("transform", `translate(66 106) rotate(${cur.lR1.toFixed(1)})`);
      r.kneeR?.setAttribute("transform", `translate(0 22) rotate(${(-cur.lR2).toFixed(1)})`);
      r.head?.setAttribute("transform", `rotate(${cur.head.toFixed(1)} 60 66)`);
      r.eyes?.setAttribute("transform", `translate(${cur.ex.toFixed(1)} ${cur.ey.toFixed(1)})`);
      const blink = (t % 4.2) > 4.05 ? 0.1 : 1;
      r.eyeL?.setAttribute("transform", `translate(50 38) scale(1 ${blink}) translate(-50 -38)`);
      r.eyeR?.setAttribute("transform", `translate(70 38) scale(1 ${blink}) translate(-70 -38)`);
      if (r.mouth) {
        r.mouth.setAttribute("ry", (1 + cur.mouth * 5).toFixed(1));
        r.mouth.setAttribute("rx", (4 + cur.mouth * 1.5).toFixed(1));
        r.mouth.style.opacity = cur.mouth > 0.08 ? 1 : 0;
      }
      if (r.smile) r.smile.style.opacity = cur.mouth > 0.08 ? 0 : 1;
      if (r.keys) r.keys.style.opacity = m === "typing" ? 1 : 0;
      if (r.dots) r.dots.style.opacity = m === "think" ? 1 : 0;
      onMode?.(m);
    };
    const tick = (now) => {
      last = now;
      apply();
      frame = requestAnimationFrame(tick);
    };
    apply();
    if (!reduced) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, auto, getLook, onMode]);

  const limb = { fill: "none", stroke: INK, strokeWidth: 3.8, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg
      ref={root}
      className={`rig ${className}`.trim()}
      width={head ? size : (size * 120) / 170}
      height={head ? size : size}
      viewBox={head ? "26 6 68 62" : "0 0 120 170"}
      aria-hidden="true"
      focusable="false"
      onClick={onClick}
      style={{ overflow: "visible" }}
    >
      <ellipse cx="60" cy="166" rx="30" ry="5" fill="rgba(0,0,0,.12)" />
      <g ref={set("root")}>
        <g ref={set("legL")}>
          <path d="M0 0V22" {...limb} />
          <g ref={set("kneeL")}>
            <path d="M0 0V22" {...limb} />
            <ellipse cx="7" cy="22" rx="8" ry="4.4" {...limb} />
          </g>
        </g>
        <g ref={set("legR")}>
          <path d="M0 0V22" {...limb} />
          <g ref={set("kneeR")}>
            <path d="M0 0V22" {...limb} />
            <ellipse cx="7" cy="22" rx="8" ry="4.4" {...limb} />
          </g>
        </g>
        <path d="M46 68Q60 62 74 68Q86 90 76 104Q60 113 44 104Q34 90 46 68Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <g ref={set("armL")}>
          <path d="M0 0V20" {...limb} />
          <g ref={set("foreL")}>
            <path d="M0 0V16" {...limb} />
            <ellipse cx="0" cy="22" rx="4.4" ry="7" {...limb} />
          </g>
        </g>
        <g ref={set("armR")}>
          <path d="M0 0V20" {...limb} />
          <g ref={set("foreR")}>
            <path d="M0 0V16" {...limb} />
            <ellipse cx="0" cy="22" rx="4.4" ry="7" {...limb} />
          </g>
        </g>
        <g ref={set("keys")} style={{ opacity: 0 }}>
          <rect x="38" y="100" width="44" height="9" rx="3" fill="#fff" stroke="#9a9a9a" strokeWidth="2.4" />
        </g>
        <g ref={set("head")}>
          <ellipse cx="60" cy="38" rx="31" ry="27" fill="#fff" stroke={INK} strokeWidth="4" />
          <g ref={set("eyes")} fill={INK}>
            <ellipse ref={set("eyeL")} cx="50" cy="38" rx="2.8" ry="3.6" />
            <ellipse ref={set("eyeR")} cx="70" cy="38" rx="2.8" ry="3.6" />
            <path ref={set("smile")} d="M53 49Q60 56 67 49" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
            <ellipse ref={set("mouth")} cx="60" cy="51" rx="4" ry="1" style={{ opacity: 0 }} />
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
