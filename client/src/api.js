const BASE = import.meta.env.VITE_API_URL || '/api';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload;
}

export const api = {
  health: () => request('/health'),
  stats: () => request('/stats'),
  announcements: {
    list: (params) => request(`/announcements${queryString(params)}`),
    create: (body) => request('/announcements', { method: 'POST', body }),
    remove: (id) => request(`/announcements/${id}`, { method: 'DELETE' }),
  },
  services: {
    list: (params) => request(`/services${queryString(params)}`),
    create: (body) => request('/services', { method: 'POST', body }),
    remove: (id) => request(`/services/${id}`, { method: 'DELETE' }),
  },
  locations: {
    list: (params) => request(`/service-locations${queryString(params)}`),
    create: (body) => request('/service-locations', { method: 'POST', body }),
    remove: (id) => request(`/service-locations/${id}`, { method: 'DELETE' }),
  },
};
