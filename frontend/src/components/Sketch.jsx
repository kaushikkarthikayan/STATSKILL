import { Stickman } from "../art/Characters.jsx";
import { Doodle } from "../art/Doodles.jsx";
import { ReactiveText, Reveal } from "../fx/Effects.jsx";

/* Small building blocks of the sketch design, shared by every page. */

/* The big page title: kicker sticker, letters that react to the mouse, a short line of help, and an optional character. */
export function PageHead({ kicker, title, lead, actions, pose, mood, children }) {
  return (
    <header className="phead">
      <div className="phead__text">
        {kicker && <span className="pill phead__kicker">{kicker}</span>}
        <h1 className="page-title">
          <ReactiveText text={title} />
        </h1>
        {lead && <p className="lead">{lead}</p>}
        {actions && <div className="row phead__actions">{actions}</div>}
        {children}
      </div>
      {pose && (
        <div className="phead__art" aria-hidden="true">
          <Stickman pose={pose} mood={mood} size={96} />
        </div>
      )}
    </header>
  );
}

/* A section heading with a hand-drawn underline. */
export function SectionTitle({ children, doodle, id }) {
  return (
    <h2 className="section-title" id={id}>
      {doodle && <Doodle name={doodle} size={26} />}
      <span>{children}</span>
    </h2>
  );
}

export function Bubble({ children, tone = "white", side = "left", className = "" }) {
  return <div className={`bubble bubble--${tone} bubble--${side} ${className}`.trim()}>{children}</div>;
}

/* A card people can pick: a real radio button or checkbox underneath, so keyboards and screen readers work as usual. */
export function Choice({ type = "checkbox", name, checked, onChange, disabled, className = "", children, label }) {
  return (
    <label className={`choice ${checked ? "is-checked" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()} data-cursor="click">
      <input className="sr-only" type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} aria-label={label} />
      <span className="choice__card">
        {children}
        <span className="choice__tick" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
      </span>
    </label>
  );
}

/* A row of radio buttons drawn as one segmented control. options: [{ id, label }] */
export function Segmented({ name, options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label className={`segmented__item ${value === option.id ? "is-checked" : ""}`} key={option.id} data-cursor="click">
          <input className="sr-only" type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/* A number picker with minus and plus buttons and quick presets. */
export function Stepper({ value, onChange, min = 1, max = 50, presets = [], label }) {
  const set = (next) => onChange(Math.max(min, Math.min(max, Math.round(Number(next) || min))));
  return (
    <div className="stepper">
      <div className="stepper__main">
        <button type="button" className="stepper__btn" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`Fewer ${label || "items"}`}>
          -
        </button>
        <output className="stepper__value" aria-live="polite">
          {value}
        </output>
        <button type="button" className="stepper__btn" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`More ${label || "items"}`}>
          +
        </button>
      </div>
      {presets.length > 0 && (
        <div className="stepper__presets">
          {presets.map((preset) => (
            <button type="button" key={preset} className={`chip chip--button ${value === preset ? "is-on" : ""}`} onClick={() => set(preset)}>
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATE_TEXT = { not_started: "Not started", in_progress: "In progress", completed: "Completed" };
/* The three level states have three clearly different looks. */
export function StateSticker({ state }) {
  return (
    <span className={`state state--${state}`}>
      {state === "completed" && (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === "in_progress" && <i className="state__pulse" aria-hidden="true" />}
      {state === "not_started" && (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="3 4" />
        </svg>
      )}
      {STATE_TEXT[state] || state}
    </span>
  );
}

/* A friendly empty state: a stickman and a short explanation. */
export function Placeholder({ title, children, action, pose = "shrug" }) {
  return (
    <Reveal className="empty">
      <Stickman pose={pose} size={88} />
      <h3>{title}</h3>
      {children && <p className="muted" style={{ margin: 0, maxWidth: "52ch" }}>{children}</p>}
      {action}
    </Reveal>
  );
}
