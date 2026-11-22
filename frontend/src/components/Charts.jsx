import { useState } from "react";
import { useCountUp, useInView } from "../fx/motion.jsx";
import { STATUS_LABEL } from "../utils.js";

/* Every chart here is plain SVG or CSS. Each one draws itself in when it scrolls into view
   (instantly when motion is reduced) and shows only numbers it is given: nothing is invented. */
const clamp = (value) => Math.max(0, Math.min(100, value));
const FILL = { strong: "", developing: "bar__fill--warn", weak: "bar__fill--bad" };
const INK_LINE = "#111";

/* A single animated progress bar. */
export function Meter({ value, label, tone = "", delay = 0 }) {
  const [ref, seen] = useInView();
  const known = typeof value === "number";
  return (
    <div
      ref={ref}
      className="bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(known ? value : 0)}
    >
      <div className={`bar__fill ${tone}`} style={{ width: `${seen && known ? clamp(value) : 0}%`, transitionDelay: `${delay}ms` }} />
    </div>
  );
}

/* Horizontal bars, one per topic. rows: [{ label, value (0-100 or null), note, status }] */
export function BarList({ rows }) {
  const [ref, seen] = useInView();
  return (
    <div className="barlist" ref={ref}>
      {rows.map((row, index) => {
        const known = typeof row.value === "number";
        return (
          <div className="barlist__row" key={row.label}>
            <div className="barlist__head">
              <span>{row.label}</span>
              <span>
                {known ? `${Math.round(row.value)}%` : "No answers yet"}
                {row.status && <span className="muted small"> · {STATUS_LABEL[row.status] || row.status}</span>}
              </span>
            </div>
            <div className="bar" role="progressbar" aria-label={row.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(known ? row.value : 0)}>
              <div
                className={`bar__fill ${FILL[row.status] || ""}`}
                style={{ width: `${seen && known ? clamp(row.value) : 0}%`, transitionDelay: `${index * 80}ms` }}
              />
            </div>
            {row.note && <span className="muted small">{row.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* Circular progress with a counting number in the middle. */
export function Ring({ value, label, size = 150, color = "var(--green-2)", sub }) {
  const [ref, seen] = useInView();
  const known = typeof value === "number";
  const shown = known ? clamp(value) : 0;
  const counted = useCountUp(known ? Math.round(value) : null, { active: seen });
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      ref={ref}
      className="ring"
      style={{ "--ring": `${size}px` }}
      role="img"
      aria-label={`${label}: ${known ? `${Math.round(value)} percent` : "no data yet"}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E3E0D4" strokeWidth="14" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          className="ring__arc"
          style={{ strokeDasharray: `${seen ? (shown / 100) * circumference : 0} ${circumference}`, opacity: shown > 0 ? 1 : 0 }}
        />
      </svg>
      <div className="ring__label">
        <span>
          {known ? `${counted}%` : "-"}
          <small>{sub || label}</small>
        </span>
      </div>
    </div>
  );
}

/* Donut with tooltips. segments: [{ id, label, value, color, detail }]. Hover or focus a legend item to see the same tooltip. */
export function DonutChart({ segments, centerValue, centerSuffix = "%", centerLabel, size = 230, emptyText = "No data yet", ariaLabel }) {
  const [ref, seen] = useInView();
  const [active, setActive] = useState(null);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const visible = segments.filter((segment) => segment.value > 0).length;
  const gap = visible > 1 ? 2 : 0;
  const counted = useCountUp(typeof centerValue === "number" ? centerValue : null, { active: seen });

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = total ? (segment.value / total) * circumference : 0;
    const arc = { ...segment, length, offset, middle: total ? ((offset + length / 2) / circumference) * Math.PI * 2 - Math.PI / 2 : 0 };
    offset += length;
    return arc;
  });
  const current = active === null ? null : arcs.find((arc) => arc.id === active);
  const tip =
    current && current.value > 0
      ? { left: `${50 + (radius / 120) * 100 * Math.cos(current.middle)}%`, top: `${50 + (radius / 120) * 100 * Math.sin(current.middle)}%` }
      : null;
  const summary = ariaLabel || `${centerLabel || "Chart"}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`;

  return (
    <div className="donut" ref={ref}>
      <div className="donut__figure" style={{ "--donut": `${size}px` }} role="img" aria-label={summary}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <g transform="rotate(-90 60 60)">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#E3E0D4" strokeWidth="22" strokeDasharray={total ? undefined : "4 6"} />
            {arcs.map((arc, index) =>
              arc.value > 0 ? (
                <circle
                  key={arc.id}
                  className="donut__arc"
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={active === arc.id ? 27 : 22}
                  style={{
                    strokeDasharray: `${seen ? Math.max(0, arc.length - gap) : 0} ${circumference}`,
                    strokeDashoffset: -arc.offset,
                    transitionDelay: `${index * 140}ms`,
                  }}
                  onPointerEnter={() => setActive(arc.id)}
                  onPointerLeave={() => setActive(null)}
                />
              ) : null
            )}
          </g>
          <circle cx="60" cy="60" r="31" fill="none" stroke={INK_LINE} strokeWidth="2.5" />
          <circle cx="60" cy="60" r="53.5" fill="none" stroke={INK_LINE} strokeWidth="2.5" />
        </svg>
        <div className="donut__center">
          <span className="donut__value">{typeof centerValue === "number" ? `${counted}${centerSuffix}` : "-"}</span>
          {centerLabel && <small>{total ? centerLabel : emptyText}</small>}
        </div>
        {tip && (
          <div className="chart-tip" style={tip} role="status">
            <strong>{current.label}</strong>
            <span>
              {current.value} {current.unit || ""} · {Math.round((current.value / total) * 100)}%
            </span>
            {current.detail && <em>{current.detail}</em>}
          </div>
        )}
      </div>
      <ul className="donut__legend">
        {arcs.map((arc) => (
          <li key={arc.id}>
            <button
              type="button"
              className={`legend ${active === arc.id ? "is-active" : ""}`}
              onPointerEnter={() => setActive(arc.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(arc.id)}
              onBlur={() => setActive(null)}
            >
              <i style={{ background: arc.color }} />
              <span>{arc.label}</span>
              <b>{arc.value}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Scores over time with a drawing line and tooltips. points: [{ label, value (0-100), detail }] */
export function LineChart({ points, height = 230 }) {
  const [ref, seen] = useInView();
  const [hover, setHover] = useState(null);
  if (!points.length) return null;
  const width = 560;
  const left = 38;
  const right = 18;
  const top = 18;
  const bottom = 32;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const x = (i) => left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => top + innerH - (clamp(v) / 100) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const point = hover === null ? null : points[hover];
  return (
    <div className="line" ref={ref}>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Assessment scores over time: ${points.map((p) => `${p.label} ${Math.round(p.value)} percent`).join(", ")}`}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#D9D6CC" strokeDasharray="4 5" />
            <text x={left - 8} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <path
            d={`${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
            fill="var(--accent, #BDF700)"
            opacity={seen ? 0.28 : 0}
            style={{ transition: "opacity .8s ease .5s" }}
          />
        )}
        <path d={path} fill="none" stroke="#111" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" transform="translate(4 5)" opacity=".18" />
        <path
          d={path}
          pathLength="1"
          fill="none"
          stroke="#111"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }}
        />
        {seen && points.length > 1 && (
          <g className="line__rider">
            <circle r="10" fill="#E8192C" stroke="#111" strokeWidth="3" />
            <circle cx="-3.5" cy="-2" r="2.6" fill="#fff" />
            <circle cx="3.5" cy="-2" r="2.6" fill="#fff" />
            <circle cx="-3.5" cy="-1.6" r="1.2" fill="#111" />
            <circle cx="3.5" cy="-1.6" r="1.2" fill="#111" />
            <animateMotion dur="5s" begin="1.3s" repeatCount="indefinite" path={path} />
          </g>
        )}
        {points.map((p, i) => (
          <g
            key={i}
            tabIndex={0}
            role="img"
            aria-label={`${p.label}: ${Math.round(p.value)} percent${p.detail ? `, ${p.detail}` : ""}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="line__point"
          >
            <circle cx={x(i)} cy={y(p.value)} r="16" fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i ? 9 : 7}
              fill="var(--accent, #BDF700)"
              stroke="#111"
              strokeWidth="3.5"
              style={{ opacity: seen ? 1 : 0, transition: `opacity .4s ease ${0.4 + i * 0.15}s, r .2s` }}
            />
            <text x={x(i)} y={height - 8} textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      {point && (
        <div className="chart-tip" style={{ left: `${(x(hover) / width) * 100}%`, top: `${(y(point.value) / height) * 100}%` }} role="status">
          <strong>{Math.round(point.value)}%</strong>
          <span>{point.label}</span>
          {point.detail && <em>{point.detail}</em>}
        </div>
      )}
    </div>
  );
}

/* Seven small columns, one per day. days: [{ date: "YYYY-MM-DD", tests }] */
export function Sparkbars({ days }) {
  const [ref, seen] = useInView();
  const max = Math.max(1, ...days.map((day) => day.tests));
  const total = days.reduce((sum, day) => sum + day.tests, 0);
  return (
    <div className="spark" ref={ref} role="img" aria-label={`Tests submitted in the last 7 days: ${total}`}>
      {days.map((day, i) => {
        const name = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
        return (
          <div className="spark__col" key={day.date} title={`${name}: ${day.tests} test${day.tests === 1 ? "" : "s"}`}>
            <span className="spark__num">{day.tests || ""}</span>
            <span
              className={`spark__bar ${day.tests ? "is-on" : ""}`}
              style={{ height: seen ? `${day.tests ? 18 + (day.tests / max) * 82 : 6}%` : "6%", transitionDelay: `${i * 70}ms` }}
            />
            <small>{name.slice(0, 3)}</small>
          </div>
        );
      })}
    </div>
  );
}
