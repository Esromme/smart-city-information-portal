import { supabase } from './lib/supabase.js';

const BASE = import.meta.env.VITE_API_URL || '/api';

function queryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== 'all'
    ) {
      search.set(key, value);
    }
  });

  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let accessToken = token;

  // Attach the current Supabase access token to every write request.
  if (!accessToken && method !== 'GET') {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error('Could not retrieve your login session.');
    }

    accessToken = data.session?.access_token;
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error || `Request failed (${response.status})`
    );
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }

  return payload;
}

export const api = {
  health: () => request('/health'),

  stats: () => request('/stats'),

  weather: () => request('/weather'),

  auth: {
    me: (accessToken) => request('/auth/me', { token: accessToken }),
  },

  announcements: {
    list: (params) =>
      request(`/announcements${queryString(params)}`),

    create: (body) =>
      request('/announcements', {
        method: 'POST',
        body,
      }),

    update: (id, body) =>
      request(`/announcements/${id}`, {
        method: 'PUT',
        body,
      }),

    remove: (id) =>
      request(`/announcements/${id}`, {
        method: 'DELETE',
      }),
  },

  services: {
    list: (params) =>
      request(`/services${queryString(params)}`),

    create: (body) =>
      request('/services', {
        method: 'POST',
        body,
      }),

    update: (id, body) =>
      request(`/services/${id}`, {
        method: 'PUT',
        body,
      }),

    remove: (id) =>
      request(`/services/${id}`, {
        method: 'DELETE',
      }),
  },

  locations: {
    list: (params) =>
      request(`/service-locations${queryString(params)}`),

    create: (body) =>
      request('/service-locations', {
        method: 'POST',
        body,
      }),

    update: (id, body) =>
      request(`/service-locations/${id}`, {
        method: 'PUT',
        body,
      }),

    remove: (id) =>
      request(`/service-locations/${id}`, {
        method: 'DELETE',
      }),
  },
};
