import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useFinePointer, useInView, useMotion } from "./motion.jsx";

/* Fades and slides its content in when it scrolls into view. */
export function Reveal({ as: Tag = "div", from = "up", delay = 0, className = "", style, children, ...rest }) {
  const [ref, seen] = useInView();
  return (
    <Tag
      ref={ref}
      className={`reveal reveal--${from} ${seen ? "is-in" : ""} ${className}`.trim()}
      style={{ "--delay": `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* Big text whose letters lean away from the mouse pointer. Screen readers get the plain text. */
export function ReactiveText({ text, as: Tag = "span", className = "", radius = 150, ...rest }) {
  const { reduced } = useMotion();
  const fine = useFinePointer();
  const root = useRef(null);

  useEffect(() => {
    const node = root.current;
    if (!node || reduced || !fine) return undefined;
    const letters = [...node.querySelectorAll("[data-ch]")];
    let frame = 0;
    let point = { x: -9999, y: -9999 };

    const paint = () => {
      frame = 0;
      const area = node.getBoundingClientRect();
      const near =
        point.x > area.left - radius && point.x < area.right + radius && point.y > area.top - radius && point.y < area.bottom + radius;
      for (const letter of letters) {
        if (!near) {
          letter.style.setProperty("--k", "0");
          continue;
        }
        const box = letter.getBoundingClientRect();
        const dx = point.x - (box.left + box.width / 2);
        const dy = point.y - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy);
        const k = Math.max(0, 1 - distance / radius);
        letter.style.setProperty("--k", k.toFixed(3));
        letter.style.setProperty("--dx", `${((-dx / (distance || 1)) * k * 12).toFixed(1)}px`);
        letter.style.setProperty("--dy", `${((-dy / (distance || 1)) * k * 12).toFixed(1)}px`);
      }
    };
    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      point = { x: -9999, y: -9999 };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [reduced, fine, radius, text]);

  const words = String(text).split(" ");
  let index = 0;
  return (
    <Tag ref={root} className={`rt ${className}`.trim()} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            <span className="rt__word">
              {[...word].map((char) => {
                const i = index++;
                return (
                  <span className="rt__ch" data-ch key={i} style={{ "--rot": i % 2 ? "-7deg" : "7deg" }}>
                    {char}
                  </span>
                );
              })}
            </span>
            {w < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

/* Leans toward the pointer, like a card being held. Mouse only. */
export function Tilt({ as: Tag = "div", max = 6, className = "", style, children, ...rest }) {
  const { reduced } = useMotion();
  const node = useRef(null);
  const move = (event) => {
    if (reduced || event.pointerType !== "mouse" || !node.current) return;
    const box = node.current.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    node.current.style.setProperty("--ry", `${(px * max * 2).toFixed(2)}deg`);
    node.current.style.setProperty("--rx", `${(-py * max * 2).toFixed(2)}deg`);
  };
  const reset = () => {
    node.current?.style.setProperty("--rx", "0deg");
    node.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <Tag ref={node} className={`tilt ${className}`.trim()} style={style} onPointerMove={move} onPointerLeave={reset} {...rest}>
      {children}
    </Tag>
  );
}

/* A button that is gently pulled toward the pointer. */
export function Magnetic({ children, strength = 0.28, className = "" }) {
  const { reduced } = useMotion();
  const node = useRef(null);
  const move = (event) => {
    if (reduced || event.pointerType !== "mouse" || !node.current) return;
    const box = node.current.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    node.current.style.setProperty("--mx", `${(dx * strength).toFixed(1)}px`);
    node.current.style.setProperty("--my", `${(dy * strength).toFixed(1)}px`);
  };
  const reset = () => {
    node.current?.style.setProperty("--mx", "0px");
    node.current?.style.setProperty("--my", "0px");
  };
  return (
    <span ref={node} className={`magnetic ${className}`.trim()} onPointerMove={move} onPointerLeave={reset}>
      {children}
    </span>
  );
}

/* A decorative sticker that can be dragged around inside its parent. */
export function Draggable({ children, className = "", style, rotate = 0 }) {
  const node = useRef(null);
  const drag = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const down = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = node.current;
    if (!el) return;
    el.setPointerCapture?.(event.pointerId);
    const box = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: pos.x,
      baseY: pos.y,
      minX: parent ? pos.x + (parent.left - box.left) : -Infinity,
      maxX: parent ? pos.x + (parent.right - box.right) : Infinity,
      minY: parent ? pos.y + (parent.top - box.top) : -Infinity,
      maxY: parent ? pos.y + (parent.bottom - box.bottom) : Infinity,
    };
    setActive(true);
  };
  const move = (event) => {
    const d = drag.current;
    if (!d) return;
    setPos({
      x: Math.min(d.maxX, Math.max(d.minX, d.baseX + event.clientX - d.startX)),
      y: Math.min(d.maxY, Math.max(d.minY, d.baseY + event.clientY - d.startY)),
    });
  };
  const up = () => {
    drag.current = null;
    setActive(false);
  };

  return (
    <div
      ref={node}
      className={`draggable ${active ? "is-dragging" : ""} ${className}`.trim()}
      data-cursor="drag"
      data-cursor-label="drag me"
      aria-hidden="true"
      style={{ ...style, transform: `translate(${pos.x}px, ${pos.y}px) rotate(${active ? rotate + 5 : rotate}deg) scale(${active ? 1.07 : 1})` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {children}
    </div>
  );
}

/* A short burst of paper confetti. Draws nothing when motion is reduced. */
const CONFETTI_COLORS = ["#BDF700", "#FFD60A", "#FF7EB6", "#4FC3F7", "#FF9F43", "#A99BFF"];
export function Confetti({ pieces = 28 }) {
  const { reduced } = useMotion();
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + (i % 3) * 0.3;
        const distance = 90 + ((i * 37) % 70);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          r: (i * 53) % 360,
          c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          d: (i % 6) * 40,
          w: 6 + (i % 3) * 3,
        };
      }),
    [pieces]
  );
  if (reduced) return null;
  return (
    <span className="confetti" aria-hidden="true">
      {items.map((p, i) => (
        <i key={i} style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, "--c": p.c, "--d": `${p.d}ms`, "--w": `${p.w}px` }} />
      ))}
    </span>
  );
}
