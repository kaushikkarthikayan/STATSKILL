import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Stickman } from "./art/Characters.jsx";
import { Tick } from "./art/Mascot.jsx";

/* ---------- Success and error messages ---------- */
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type) => {
    const id = Math.random().toString(36).slice(2);
    setItems((current) => [...current, { id, message, type }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), type === "error" ? 7000 : 4000);
  }, []);
  const toast = useMemo(() => ({ success: (m) => push(m, "ok"), error: (m) => push(m, "error") }), [push]);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.type === "error" ? "toast--error" : ""}`}>
            <span className="toast__icon" aria-hidden="true">
              {item.type === "error" ? "!" : "✓"}
            </span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- "Are you sure?" before anything destructive ---------- */
const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);
  const close = useCallback(
    (answer) => {
      dialog?.resolve(answer);
      setDialog(null);
    },
    [dialog]
  );
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (event) => event.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal">
            <h2 id="confirm-title">{dialog.title}</h2>
            <p>{dialog.message}</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => close(false)} autoFocus>
                {dialog.cancelLabel || "Cancel"}
              </button>
              <button className={`btn ${dialog.danger ? "btn--danger" : "btn--primary"}`} onClick={() => close(true)}>
                {dialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/* ---------- Loading, errors, empty states ---------- */
export function Loading({ label = "Loading..." }) {
  return (
    <div className="center-box" role="status">
      <Tick size={84} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="alert alert--error" role="alert">
      <p style={{ margin: "0 0 8px" }}>{error?.message || "Something went wrong."}</p>
      {onRetry && (
        <button className="btn btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children, action, pose = "shrug" }) {
  return (
    <div className="empty">
      <Stickman pose={pose} size={84} />
      <h3>{title}</h3>
      {children && <p className="muted" style={{ margin: 0, maxWidth: "52ch" }}>{children}</p>}
      {action}
    </div>
  );
}

/* Runs a loader on mount and whenever deps change. Ignores answers that arrive late. */
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const counter = useRef(0);
  const reload = useCallback(async () => {
    const id = ++counter.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loader();
      if (id === counter.current) setState({ loading: false, data, error: null });
    } catch (error) {
      if (id === counter.current) setState({ loading: false, data: null, error });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload();
    return () => {
      counter.current += 1;
    };
  }, [reload]);
  return { ...state, reload };
}

/* ---------- Form pieces ---------- */
export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function PasswordField({ id, value, onChange, autoComplete, ...rest }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        className="input"
        type={shown ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        {...rest}
      />
      <button type="button" onClick={() => setShown((current) => !current)} aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"}>
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          className="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

