import { create } from 'zustand';
import api, { getToken, setToken, clearToken } from '../api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getToken(),
  loading: false,
  error: null,

  init: async () => {
    const token = getToken();
    if (!token) return;
    set({ loading: true });
    try {
      const user = await api.getMe();
      set({ user, loading: false });
    } catch (e) {
      clearToken();
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(username, password);
      setToken(res.access_token);
      const user = await api.getMe();
      set({ user, token: res.access_token, loading: false });
      return true;
    } catch (e) {
      set({ error: e.message, loading: false });
      return false;
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register({ username, email, password });
      setToken(res.access_token);
      const user = await api.getMe();
      set({ user, token: res.access_token, loading: false });
      return true;
    } catch (e) {
      set({ error: e.message, loading: false });
      return false;
    }
  },

  logout: () => {
    clearToken();
    set({ user: null, token: null });
  },
}));