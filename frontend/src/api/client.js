const API_BASE = '/api';

export async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Digest
  getTodayDigest: () => fetchJson('/digest/today'),
  getDigestHistory: () => fetchJson('/digest/history'),
  generateDigest: (payload) => fetchJson('/digest/generate', { method: 'POST', body: JSON.stringify(payload) }),
  generateAudio: (id) => fetchJson(`/digest/${id}/audio`, { method: 'POST' }),

  // Sources
  getSources: () => fetchJson('/sources'),
  createSource: (payload) => fetchJson('/sources', { method: 'POST', body: JSON.stringify(payload) }),
  updateSource: (id, payload) => fetchJson(`/sources/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSource: (id) => fetchJson(`/sources/${id}`, { method: 'DELETE' }),
  syncAllSources: () => fetchJson('/sources/sync', { method: 'POST' }),
  syncSource: (id) => fetchJson(`/sources/${id}/sync`, { method: 'POST' }),

  // Filter & Rejection logs
  getRejections: (params = '') => fetchJson(`/rejections${params}`),
  getRejectionStats: () => fetchJson('/rejections/stats'),
  clearRejections: () => fetchJson('/rejections/clear', { method: 'DELETE' }),

  // Settings & System
  getSettings: () => fetchJson('/settings'),
  updateSettings: (payload) => fetchJson('/settings', { method: 'POST', body: JSON.stringify(payload) }),
  getModels: () => fetchJson('/settings/models'),
  getHealth: () => fetchJson('/settings/health'),
};
