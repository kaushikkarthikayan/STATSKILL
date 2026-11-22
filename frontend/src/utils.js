// Small helpers shared by the pages.

// The backend stores UTC times without a "Z", so one is added before the browser converts to local time.
export function fmtDate(value) {
  if (!value) return "";
  const text = /Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// "5 Mar": a short date for chart labels and timelines.
export function shortDate(value) {
  if (!value) return "";
  const date = new Date(/Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const roundTo = (value, digits = 0) => (typeof value === "number" ? Math.round(value * 10 ** digits) / 10 ** digits : value);

export const pct = (value) => (value === null || value === undefined ? "No data yet" : `${Math.round(value * 10) / 10}%`);

export const KIND_LABEL = { assessment: "Assessment", practice: "Practice", revision: "Revision" };
export const STATUS_LABEL = {
  strong: "Strong",
  developing: "Developing",
  weak: "Needs work",
  limited_data: "Few answers",
  not_assessed: "Not assessed",
};
export const STATUS_CHIP = {
  strong: "chip--ok",
  developing: "chip--warn",
  weak: "chip--bad",
  limited_data: "",
  not_assessed: "",
};

// One option per line, as typed into a textarea.
export const toLines = (text) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
export const toList = (text) => text.split(",").map((item) => item.trim()).filter(Boolean);

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Same rules as the backend: 8 or more characters with a letter and a number.
export function passwordProblem(password) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
  return "";
}
