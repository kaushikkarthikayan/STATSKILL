import { useEffect, useRef } from "react";
import { useFinePointer, useMotion } from "./motion.jsx";

/* The sketch cursor: a hand-drawn ring and dot with a short ink trail.
   - It never takes part in clicks (pointer-events: none), so buttons and links work exactly as before.
   - It only runs on a mouse or trackpad. Touch screens, reduced motion and the menu switch keep the normal cursor.
   - Text fields keep the normal text cursor so typing stays comfortable. */
const TRAIL = 6;
const CLICKABLE =
  "a[href], button, [role='button'], [role='radio'], [role='checkbox'], [role='tab'], [role='switch'], summary, label[for], select, input[type='checkbox'], input[type='radio'], input[type='range'], input[type='file'], [data-cursor='click']";
const TEXTY =
  "input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']):not([type='color']):not([type='button']):not([type='submit']), textarea, [contenteditable='true']";

export default function Cursor() {
  const { reduced, cursorOn } = useMotion();
  const fine = useFinePointer();
  const enabled = cursorOn && fine && !reduced;
  const root = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = root.current;
    if (!el) return undefined;
    const html = document.documentElement;
    const main = el.querySelector(".sk-cursor__main");
    const label = el.querySelector(".sk-cursor__label");
    const dots = [...el.querySelectorAll(".sk-cursor__trail")];
    const target = { x: -100, y: -100 };
    const trail = dots.map(() => ({ x: -100, y: -100 }));
    let frame = 0;
    let shown = false;
    let variant = "default";

    const setVariant = (next, text = "") => {
      if (next !== variant) {
        variant = next;
        el.dataset.variant = next;
      }
      if (label.textContent !== text) label.textContent = text;
    };
    const hide = () => {
      shown = false;
      el.classList.remove("is-on");
      html.classList.remove("has-sketch-cursor");
    };
    const loop = () => {
      frame = 0;
      main.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      let settled = true;
      let previous = target;
      dots.forEach((dot, i) => {
        const p = trail[i];
        p.x += (previous.x - p.x) * 0.4;
        p.y += (previous.y - p.y) * 0.4;
        if (Math.abs(previous.x - p.x) > 0.4 || Math.abs(previous.y - p.y) > 0.4) settled = false;
        dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        previous = p;
      });
      if (!settled) frame = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };

    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") {
        hide();
        return;
      }
      target.x = event.clientX;
      target.y = event.clientY;
      if (!shown) {
        shown = true;
        trail.forEach((p) => {
          p.x = target.x;
          p.y = target.y;
        });
        el.classList.add("is-on");
        html.classList.add("has-sketch-cursor");
      }
      const node = event.target instanceof Element ? event.target : null;
      const custom = node?.closest("[data-cursor]");
      if (node?.closest(TEXTY)) setVariant("text");
      else if (custom && custom.dataset.cursor !== "click") setVariant(custom.dataset.cursor, custom.dataset.cursorLabel || "");
      else if (node?.closest(CLICKABLE)) setVariant("click", custom?.dataset.cursorLabel || "");
      else setVariant("default");
      wake();
    };
    const onDown = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      el.classList.add("is-down");
      const pop = document.createElement("span");
      pop.className = "sk-cursor__pop";
      pop.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      el.appendChild(pop);
      setTimeout(() => pop.remove(), 700);
    };
    const onUp = () => el.classList.remove("is-down");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    html.addEventListener("mouseleave", hide);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      html.removeEventListener("mouseleave", hide);
      cancelAnimationFrame(frame);
      html.classList.remove("has-sketch-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="sk-cursor" ref={root} data-variant="default" aria-hidden="true">
      {Array.from({ length: TRAIL }, (_, i) => (
        <span className="sk-cursor__trail" key={i} style={{ "--i": i }} />
      ))}
      <span className="sk-cursor__main">
        <span className="sk-cursor__ring" />
        <span className="sk-cursor__dot" />
        <span className="sk-cursor__label" />
      </span>
    </div>
  );
}
