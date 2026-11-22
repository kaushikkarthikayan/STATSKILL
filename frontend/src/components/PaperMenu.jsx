import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Stickman } from "../art/Characters.jsx";
import { useMotion } from "../fx/motion.jsx";
import { Bubble } from "./Sketch.jsx";
import Icon from "./Icon.jsx";

/* The paper tag that hangs from the top of every page. Click it, press Enter, or drag it down to open the menu. */
export function PullTab({ open, onToggle, buttonRef }) {
  const drag = useRef(null);
  const [pull, setPull] = useState(0);

  const down = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => {
    if (!drag.current) return;
    const distance = Math.max(0, Math.min(70, event.clientY - drag.current.y));
    if (distance > 5) drag.current.moved = true;
    setPull(open ? 0 : distance);
  };
  const up = () => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (state.moved) {
      if (pull > 30 && !open) onToggle(true);
    } else {
      onToggle(!open);
    }
    setPull(0);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`pull ${open ? "is-open" : ""}`}
      aria-expanded={open}
      aria-controls="paper-menu"
      aria-label={open ? "Close the menu" : "Open the menu"}
      style={{ "--pull": `${pull}px` }}
      data-cursor="drag"
      data-cursor-label={open ? "push up" : "pull me"}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        drag.current = null;
        setPull(0);
      }}
      onClick={(event) => {
        // Keyboard and screen-reader activation has no pointer position; the pointer path above handles mouse and touch.
        if (event.detail === 0) onToggle(!open);
      }}
    >
      <span className="pull__cord" aria-hidden="true" />
      <span className="pull__tag" aria-hidden="true">
        {open ? "PUSH UP" : "PULL ME"}
      </span>
    </button>
  );
}

function Switch({ checked, onChange, disabled, children }) {
  return (
    <label className={`switch ${disabled ? "is-disabled" : ""}`} data-cursor="click">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch__track" aria-hidden="true">
        <i />
      </span>
      <span>{children}</span>
    </label>
  );
}

/* The full-screen paper menu: giant links, a character, and the comfort switches (motion and cursor). */
export default function PaperMenu({ open, onClose, items, user, onLogout, returnFocus }) {
  const { reduced, systemReduced, manualReduced, setManualReduced, cursorOn, setCursorOn } = useMotion();
  const panel = useRef(null);
  const first = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => first.current?.focus(), reduced ? 0 : 380);
    const onKey = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll("a[href], button:not([disabled]), input:not([disabled])")];
      if (!focusable.length) return;
      const start = focusable[0];
      const end = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const back = returnFocus?.current;
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [open, onClose, reduced, returnFocus]);

  return (
    <div id="paper-menu" ref={panel} className={`paper-menu paper ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Site menu" aria-hidden={!open}>
      <div className="paper-menu__inner">
        <ol className="paper-menu__list">
          {items.map((item, index) => (
            <li key={item.to} style={{ "--i": index }}>
              <NavLink
                to={item.to}
                end={item.to === "/about"}
                ref={index === 0 ? first : undefined}
                className={({ isActive }) => `paper-menu__link ${isActive ? "is-active" : ""}`}
                onClick={onClose}
                tabIndex={open ? 0 : -1}
              >
                <span className="paper-menu__num">{String(index + 1).padStart(2, "0")}</span>
                <span className="paper-menu__label display">{item.label}</span>
                <Icon name={item.icon} size={34} />
              </NavLink>
            </li>
          ))}
        </ol>

        <aside className="paper-menu__side">
          <Bubble tone="white" side="left">
            Hi {user.full_name.split(" ")[0]}! Where to?
          </Bubble>
          <Stickman pose="point" size={120} />
          <div className="paper-menu__prefs">
            <Switch checked={reduced} disabled={systemReduced} onChange={setManualReduced}>
              Reduce motion{systemReduced ? " (set by your device)" : manualReduced ? " (on)" : ""}
            </Switch>
            <Switch checked={cursorOn} onChange={setCursorOn}>
              Sketch cursor
            </Switch>
          </div>
          <button type="button" className="btn btn--primary" onClick={onLogout} tabIndex={open ? 0 : -1}>
            <Icon name="logout" size={18} />
            Log out
          </button>
        </aside>
      </div>
    </div>
  );
}
