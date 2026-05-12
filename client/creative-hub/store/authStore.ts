import { create } from "zustand";
import { getCurrentUser, login, logout } from "../api/auth";
interface AuthState {
  user: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  login: async (username, password) => {
    const response = await login(username, password);
    set({ user: response.user || response });
  },
  fetchUser: async () => {
    set({ loading: true });
    try {
      const response = await getCurrentUser();
      set({ user: response.data, loading: false });
    } catch (error) {
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
    set({ user: null });
  },
}));
