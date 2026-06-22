import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dispatcher' | 'driver';
  language: string;
  allowedPages?: string[];
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('hapcargo_token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('hapcargo_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'hapcargo_auth' }
  )
);
