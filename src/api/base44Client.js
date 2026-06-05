// Self-hosted API client. Drop-in replacement for the former @base44/sdk client:
// it exposes the same `base44.auth / entities / functions / integrations / users`
// surface the app already uses, but talks to our own Express backend.

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'meridian_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

async function apiFetch(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (isForm) {
    payload = body; // FormData; let the browser set the multipart boundary.
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });

  if (!res.ok) {
    let message;
    try {
      message = (await res.json()).error;
    } catch {
      message = `Request failed (${res.status})`;
    }
    const err = new Error(message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ───────────────────────── auth ───────────────────────── */

const auth = {
  me: () => apiFetch('/auth/me'),

  async isAuthenticated() {
    if (!getToken()) return false;
    try {
      await apiFetch('/auth/me');
      return true;
    } catch {
      return false;
    }
  },

  async login(email, password) {
    const { token, user } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(token);
    return user;
  },

  async register(email, password, full_name) {
    const { token, user } = await apiFetch('/auth/register', {
      method: 'POST',
      body: { email, password, full_name },
    });
    setToken(token);
    return user;
  },

  async logout(redirectUrl) {
    setToken(null);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* token already cleared; ignore */
    }
    if (redirectUrl) window.location.href = '/login';
  },

  redirectToLogin() {
    window.location.href = '/login';
  },
};

/* ───────────────────────── entities ─────────────────────────
   Any entity name works: base44.entities.ConsultationResult.filter(...) etc. */

const entities = new Proxy(
  {},
  {
    get(_target, type) {
      return {
        filter: (query = {}, sort, limit) =>
          apiFetch(`/entities/${type}/filter`, { method: 'POST', body: { query, sort, limit } }),
        create: (data) => apiFetch(`/entities/${type}`, { method: 'POST', body: data }),
        update: (id, data) => apiFetch(`/entities/${type}/${id}`, { method: 'PUT', body: data }),
        get: (id) => apiFetch(`/entities/${type}/${id}`),
      };
    },
  }
);

/* ───────────────────────── functions ─────────────────────────
   Returns { data } so callers can keep using res.data.<field>. */

const functions = {
  async invoke(name, body) {
    const data = await apiFetch(`/functions/${name}`, { method: 'POST', body });
    return { data };
  },
};

/* ───────────────────────── integrations ───────────────────────── */

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const form = new FormData();
      form.append('file', file);
      return apiFetch('/integrations/upload', { method: 'POST', body: form, isForm: true });
    },
    ExtractDataFromUploadedFile: ({ file_url, json_schema }) =>
      apiFetch('/integrations/extract', { method: 'POST', body: { file_url, json_schema } }),
  },
};

/* ───────────────────────── users ───────────────────────── */

const users = {
  inviteUser: (email, role) =>
    apiFetch('/users/invite', { method: 'POST', body: { email, role } }),
};

/* ───────────────────────── demo ─────────────────────────
   Wipes the current user's data so the demo restarts from onboarding. */

const demo = {
  reset: () => apiFetch('/demo/reset', { method: 'POST' }),
};

export const base44 = { auth, entities, functions, integrations, users, demo };
