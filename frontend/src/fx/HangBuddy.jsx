import { useEffect, useRef, useState } from "react";
import Ghost from "../art/Ghost.jsx";
import Rig from "../art/Rig.jsx";
import { useMotion } from "./motion.jsx";

/* A stick figure hangs from the "PULL ME" cord and swings. Now and then his grip slips and he falls down the page;
   the ghost from the sheet swoops in, catches him, carries him back up and waves goodbye.
   Click him to make him slip right away. Reduced motion: he just hangs still. */
const SIZE = 72;
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

export default function HangBuddy({ anchorRef }) {
  const { reduced } = useMotion();
  const man = useRef(null);
  const ghost = useRef(null);
  const state = useRef({ phase: "hang", t0: 0, dur: 8, land: { x: 0, y: 0 } });
  const [manMode, setManMode] = useState("hang");
  const [ghostMode, setGhostMode] = useState("swoop");
  const go = (phase, dur) => {
    const s = state.current;
    s.phase = phase;
    s.t0 = performance.now() / 1000;
    s.dur = dur;
    if (phase === "hang") setManMode("hang");
    if (phase === "fall") setManMode("fall");
    if (phase === "carry") {
      setManMode("shy");
      setGhostMode("swoop");
    }
    if (phase === "regrab") {
      setManMode("cheer");
      setGhostMode("cheer");
    }
  };

  useEffect(() => {
    if (reduced) return undefined;
    let frame = 0;
    state.current.t0 = performance.now() / 1000;
    state.current.dur = 7 + Math.random() * 6;
    const tick = () => {
      const s = state.current;
      const now = performance.now() / 1000;
      const el = man.current;
      const gh = ghost.current;
      const tag = anchorRef.current?.getBoundingClientRect();
      if (el && tag) {
        const ax = tag.left + tag.width / 2;
        const ay = tag.bottom - 4;
        const p = Math.min(1, (now - s.t0) / s.dur);
        const fallDist = Math.min(window.innerHeight * 0.72, 560);
        let x = ax;
        let y = ay;
        let rot = Math.sin(now * 1.7) * 7;
        let ghostOn = false;
        let gx = 0;
        let gy = 0;
        let gop = 1;
        if (s.phase === "hang") {
          if (p >= 1) go("fall", 1.35);
        } else if (s.phase === "fall") {
          y = ay + fallDist * p * p;
          x = ax - 40 * p;
          rot = Math.sin(now * 12) * 18 * p;
          s.land = { x, y };
          ghostOn = p > 0.35;
          const q = (p - 0.35) / 0.65;
          gx = window.innerWidth + 90 + (x + 70 - (window.innerWidth + 90)) * ease(Math.min(1, q));
          gy = y + 30;
          if (p >= 1) go("carry", 2.4);
        } else if (s.phase === "carry") {
          const e = ease(p);
          x = s.land.x + (ax - s.land.x) * e;
          y = s.land.y + (ay - s.land.y) * e;
          rot = Math.sin(now * 3) * 5;
          ghostOn = true;
          gx = x + 48;
          gy = y + 18 + Math.sin(now * 4) * 4;
          if (p >= 1) go("regrab", 1.6);
        } else if (s.phase === "regrab") {
          rot = Math.sin(now * 3) * 4;
          ghostOn = true;
          gx = ax + 48 + ease(p) * (window.innerWidth * 0.2);
          gy = ay + 18 - ease(p) * 80;
          gop = 1 - ease(p);
          if (p >= 1) {
            go("hang", 8 + Math.random() * 8);
            setGhostMode("swoop");
          }
        }
        el.style.transform = `translate(${(x - SIZE * 0.33).toFixed(1)}px, ${(y - 13).toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
        if (gh) {
          gh.style.opacity = ghostOn ? gop : 0;
          gh.style.transform = `translate(${(gx - 30).toFixed(1)}px, ${gy.toFixed(1)}px)`;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, anchorRef]);

  if (reduced) return null;
  return (
    <>
      <div className="hang" ref={ghost} aria-hidden="true" style={{ opacity: 0 }}>
        <Ghost mode={ghostMode} size={64} />
      </div>
      <button type="button" className="hang hang--man" ref={man} tabIndex={-1} aria-hidden="true" onClick={() => state.current.phase === "hang" && go("fall", 1.35)} data-cursor-label="whoa!">
        <Rig mode={manMode} size={SIZE} />
      </button>
    </>
  );
}
