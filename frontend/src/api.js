// Small fetch wrapper. The login token is kept in localStorage when the browser allows it.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};

let memoryToken = store.get("cp_token");

export function setSession(token, user) {
  memoryToken = token;
  if (token) { store.set("cp_token", token); store.set("cp_user", JSON.stringify(user)); }
  else { store.del("cp_token"); store.del("cp_user"); }
}

export function savedUser() {
  try { return JSON.parse(store.get("cp_user")); } catch { return null; }
}

function message(detail) {
  if (!detail) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => {
      const field = (d.loc || []).filter((x) => x !== "body").join(" ");
      const msg = (d.msg || "").replace("Value error, ", "");
      return field ? `${field.replace(/_/g, " ")}: ${msg}` : msg;
    }).join(" ");
  }
  return String(detail);
}

export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  if (memoryToken) headers.Authorization = `Bearer ${memoryToken}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && path !== "/api/auth/login") setSession(null);
    throw new Error(message(data && data.detail));
  }
  return data;
}

export const CLASSES = ["First Class", "Second Class Upper", "Second Class Lower", "Third Class"];
export const SHORT = { "First Class": "First", "Second Class Upper": "2:1", "Second Class Lower": "2:2", "Third Class": "Third" };
export const CLASS_COLOR = { "First Class": "#2a78d6", "Second Class Upper": "#eb6834", "Second Class Lower": "#1baf7a", "Third Class": "#eda100" };
export const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
