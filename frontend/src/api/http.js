const RAW = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : "";

const API_ROOT = String(RAW ?? "").trim().replace(/\/$/, "");

if (typeof import.meta !== "undefined" && import.meta.env?.MODE === "production" && !API_ROOT)
  console.warn(
    "[pythontest] Falta VITE_API_URL en el build. Configúrala en Render Static (URL HTTPS del backend, sin barra final)."
  );

export function resolveApiUrl(path) {
  if (!path) return API_ROOT || "/";
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!API_ROOT) return p;
  return `${API_ROOT}${p}`;
}

export function authHeaders() {
  try {
    const raw = sessionStorage.getItem("auth_session");
    if (!raw) return {};
    const s = JSON.parse(raw);
    return s?.token ? { Authorization: `Bearer ${s.token}` } : {};
  } catch {
    return {};
  }
}

export function errMessage(error) {
  const p = error?.payload;
  if (typeof p?.detail === "string") return p.detail;
  if (Array.isArray(p?.detail)) {
    try {
      return p.detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
    } catch {
      return "Ha ocurrido un error.";
    }
  }
  return error?.message || "Ha ocurrido un inconveniente con la transacción.";
}

export async function apiFetch(url, opts = {}) {
  const skipAuth = Boolean(opts.skipAuth);
  const { skipAuth: _omit, ...rest } = opts;
  const target = resolveApiUrl(url);
  const isForm = rest.body instanceof FormData;
  const merged = new Headers(rest.headers || {});

  if (!isForm && !merged.has("Content-Type"))
    merged.set("Content-Type", "application/json");

  if (!skipAuth) {
    const h = authHeaders();
    if (h.Authorization && !merged.has("Authorization"))
      merged.set("Authorization", h.Authorization);
  }

  const resp = await fetch(target, { ...rest, headers: merged });
  const text = await resp.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!resp.ok) {
    const err = new Error(resp.statusText);
    err.status = resp.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}
