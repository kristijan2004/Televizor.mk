// Тенок fetch-помошник за /api/admin.
//
// Го чита CSRF токенот од колачето admin_csrf (поставено при најава, читливо
// за JavaScript) и го додава во X-CSRF-Token на секое барање што менува
// нешто. Сесијата (admin_session) е HttpOnly и се праќа сама преку
// credentials: "include" — JS никогаш не ја допира.

const API = process.env.REACT_APP_API_URL || "/api";

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)admin_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  let payload;

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  const response = await fetch(`${API}/admin${path}`, {
    method,
    headers,
    credentials: "include",
    body: payload,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* празен одговор, на пр. кај некои грешки */
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Настана грешка на серверот.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export const adminApi = {
  login: (username, password) =>
    request("/login", { method: "POST", body: { username, password } }),

  logout: () => request("/logout", { method: "POST" }),

  me: () => request("/me"),

  changePassword: (currentPassword, newPassword) =>
    request("/change-password", { method: "POST", body: { currentPassword, newPassword } }),

  stats: () => request("/stats"),

  anhochStatus: () => request("/anhoch-status"),

  listTvs: (params = {}) => request(`/tvs?${new URLSearchParams(params)}`),

  getTv: (id) => request(`/tvs/${encodeURIComponent(id)}`),

  updateTv: (id, patch) => request(`/tvs/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),

  history: (params = {}) => request(`/history?${new URLSearchParams(params)}`),

  listPendingTvs: () => request("/pending-tvs"),

  getPendingTv: (id) => request(`/pending-tvs/${encodeURIComponent(id)}`),

  updatePendingTv: (id, patch) =>
    request(`/pending-tvs/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),

  approvePendingTv: (id) =>
    request(`/pending-tvs/${encodeURIComponent(id)}/approve`, { method: "POST" }),

  rejectPendingTv: (id) =>
    request(`/pending-tvs/${encodeURIComponent(id)}/reject`, { method: "POST" }),
};
