import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/* One place that knows whether motion is wanted.
   Motion is reduced when the device asks for it (prefers-reduced-motion) or when the student switches it off in the menu. */
const REDUCE_KEY = "statskill.reduceMotion";
const CURSOR_KEY = "statskill.cursor";

const readFlag = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
};
const writeFlag = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the choice just will not be remembered */
  }
};

const MotionContext = createContext({
  reduced: false,
  systemReduced: false,
  manualReduced: false,
  cursorOn: true,
  setManualReduced: () => {},
  setCursorOn: () => {},
});
export const useMotion = () => useContext(MotionContext);

export function MotionProvider({ children }) {
  const [system, setSystem] = useState(() => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  const [manual, setManual] = useState(() => readFlag(REDUCE_KEY, "0") === "1");
  const [cursorOn, setCursor] = useState(() => readFlag(CURSOR_KEY, "1") !== "0");

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const onChange = (event) => setSystem(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const reduced = system || manual;
  useEffect(() => {
    const root = document.documentElement;
    if (reduced) root.dataset.reduceMotion = "true";
    else delete root.dataset.reduceMotion;
  }, [reduced]);

  const setManualReduced = useCallback((value) => {
    setManual(value);
    writeFlag(REDUCE_KEY, value ? "1" : "0");
  }, []);
  const setCursorOn = useCallback((value) => {
    setCursor(value);
    writeFlag(CURSOR_KEY, value ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({ reduced, systemReduced: system, manualReduced: manual, cursorOn, setManualReduced, setCursorOn }),
    [reduced, system, manual, cursorOn, setManualReduced, setCursorOn]
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/* True on a mouse or trackpad. Touch screens keep the normal cursor and skip hover effects. */
export function useFinePointer() {
  const [fine, setFine] = useState(() => Boolean(window.matchMedia?.("(hover: hover) and (pointer: fine)").matches));
  useEffect(() => {
    const query = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    if (!query) return undefined;
    const onChange = (event) => setFine(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return fine;
}

/* Becomes true once the element has scrolled into view (and stays true).
   With reduced motion it is true straight away, so nothing is ever hidden. */
export function useInView({ rootMargin = "0px 0px -6% 0px", threshold = 0.1 } = {}) {
  const { reduced } = useMotion();
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(node);
    // Safety net: never leave content hidden if the browser does not report visibility.
    const fallback = setTimeout(() => setSeen(true), 6000);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [seen, rootMargin, threshold]);
  return [ref, seen || reduced];
}

/* Counts up to a number. Returns the target itself when it is not a number (for example null = no data). */
export function useCountUp(target, { duration = 1000, active = true, decimals = 0 } = {}) {
  const { reduced } = useMotion();
  const hasTarget = typeof target === "number" && Number.isFinite(target);
  const [value, setValue] = useState(hasTarget && (reduced || !active) ? target : 0);
  const current = useRef(0);

  useEffect(() => {
    if (!hasTarget) return undefined;
    if (reduced) {
      current.current = target;
      setValue(target);
      return undefined;
    }
    if (!active) return undefined;
    const origin = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = origin + (target - origin) * eased;
      current.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, hasTarget, reduced, active, duration]);

  if (!hasTarget) return target;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
