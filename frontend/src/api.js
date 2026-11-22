// Every request to the StatSkill AI backend goes through this file. No secrets live in the browser code.
const BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const TOKEN_KEY = "statskill.token";
let memoryToken = null; // used only when the browser blocks storage

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || memoryToken;
    } catch {
      return memoryToken;
    }
  },
  // "Remember me" keeps the session after the browser closes; otherwise it ends with the tab.
  set(token, remember) {
    memoryToken = token;
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked: the session lasts until the page is closed */
    }
  },
  clear() {
    memoryToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function messageFrom(data, status) {
  if (data && typeof data.detail === "string") return data.detail;
  if (data && Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(" ") : "";
        const text = String(item.msg || "Invalid value").replace(/^Value error, /, "");
        return field ? `${field}: ${text}` : text;
      })
      .join(" ");
  }
  if (status === 401) return "Please log in to continue.";
  if (status === 403) return "You do not have permission to do this.";
  if (status === 404) return "That item was not found.";
  if (status >= 500) return "Something went wrong on the server. Please try again.";
  return "The request could not be completed.";
}

async function send(path, { method = "GET", body, form, auth = true } = {}) {
  const headers = {};
  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form; // the browser sets the multipart header itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Cannot reach the server. Check that the backend is running, then try again.", 0);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401 && token) window.dispatchEvent(new CustomEvent("statskill:session-expired"));
    throw new ApiError(messageFrom(data, response.status), response.status, data);
  }
  return response;
}

async function json(path, options) {
  const response = await send(path, options);
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : null;
}

export const api = {
  get: (path) => json(path),
  post: (path, body) => json(path, { method: "POST", body }),
  put: (path, body) => json(path, { method: "PUT", body }),
  del: (path) => json(path, { method: "DELETE" }),
  upload: (path, formData) => json(path, { method: "POST", form: formData }),
  // Sign-in calls and the public About data are sent without a token.
  publicGet: (path) => json(path, { auth: false }),
  publicPost: (path, body) => json(path, { method: "POST", body, auth: false }),
  // Study files need the login token, so they are fetched and then opened from memory.
  raw: (path) => send(path),
};

// Starts a test and returns its id. Used by Assessment, Course Training and the progress report.
export async function startAttempt(body) {
  const attempt = await api.post("/assessments", body);
  return attempt.attempt_id;
}

// Photos are served by the backend, outside the /api prefix of the JSON calls.
export function serverUrl(path) {
  return new URL(BASE, window.location.href).origin + path;
}
