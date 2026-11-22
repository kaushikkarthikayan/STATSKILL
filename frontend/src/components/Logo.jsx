// The StatSkill AI mark, drawn with the template's logo blob. Replace the text to re-brand.
export function LogoBadge({ size }) {
  const extra = size === "lg" ? "logo-badge--lg" : size === "sm" ? "logo-badge--sm" : "";
  return (
    <div className={`logo-badge ${extra}`} aria-label="StatSkill AI" role="img">
      <span>STATSKILL</span>
      <span>AI</span>
    </div>
  );
}

// The template's sticker disc.
export function Disc({ brand, name, tag, color = "var(--yellow)", size }) {
  return (
    <div className="roll" style={{ "--c": color, ...(size ? { "--size": size } : {}) }} aria-hidden="true">
      <div className="roll__label">
        {brand && <span className="roll__brand">{brand}</span>}
        <span className="roll__name">{name}</span>
        {tag && <span className="roll__tag">{tag}</span>}
      </div>
    </div>
  );
}
