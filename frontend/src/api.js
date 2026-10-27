// API client for Quetzalcoatl

const API_BASE = import.meta.env.VITE_API_URL || (window.location.origin || 'http://localhost:8000');

export function getToken() {
  return localStorage.getItem('quetzalcoatl_token');
}

export function setToken(token) {
  localStorage.setItem('quetzalcoatl_token', token);
}

export function clearToken() {
  localStorage.removeItem('quetzalcoatl_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let message = 'Request failed';
    if (typeof err.detail === 'string') {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
    } else if (err.detail) {
      message = JSON.stringify(err.detail);
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  register: (data) => request('POST', '/api/auth/register', data),
  login: (username, password) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    return fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        let message = 'Login failed';
        if (typeof err.detail === 'string') message = err.detail;
        else if (Array.isArray(err.detail)) message = err.detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
        throw new Error(message);
      }
      return res.json();
    });
  },
  getMe: () => request('GET', '/api/auth/me'),

  // Servers
  listServers: () => request('GET', '/api/servers'),
  createServer: (data) => request('POST', '/api/servers', data),
  getServer: (id) => request('GET', `/api/servers/${id}`),
  listChannels: (serverId) => request('GET', `/api/servers/${serverId}/channels`),
  createChannel: (serverId, data) => request('POST', `/api/servers/${serverId}/channels`, data),
  joinServer: (inviteCode) => request('POST', `/api/servers/join/${inviteCode}`),

  // Direct Messages
  listConversations: () => request('GET', '/api/dms/conversations'),
  createConversation: (data) => request('POST', '/api/dms/conversations', data),
  getDMMessages: (convId, before = null, limit = 50) => {
    let path = `/api/dms/conversations/${convId}/messages?limit=${limit}`;
    if (before) path += `&before=${before}`;
    return request('GET', path);
  },
  sendDM: (convId, data) => request('POST', `/api/dms/conversations/${convId}/messages`, data),
  searchUsers: (q) => request('GET', `/api/dms/users/search?q=${encodeURIComponent(q)}`),

  // Messages
  getMessages: (channelId, before = null, limit = 50) => {
    let path = `/api/channels/${channelId}/messages?limit=${limit}`;
    if (before) path += `&before=${before}`;
    return request('GET', path);
  },
  sendMessage: (channelId, data) => request('POST', `/api/channels/${channelId}/messages`, data),
  editMessage: (messageId, data) => request('PATCH', `/api/messages/${messageId}`, data),
  deleteMessage: (messageId) => request('DELETE', `/api/messages/${messageId}`),
  addReaction: (messageId, emoji) => request('POST', `/api/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`),
  removeReaction: (messageId, emoji) => request('DELETE', `/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
};

export default api;