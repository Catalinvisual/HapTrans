import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useFormStore } from './formStore';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  language: string;
  allowedPages?: string[];
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('hapcargo_token', token);
        // The TMS and the API live on different hosts, so the refresh cookie can
        // be blocked as third-party. Keeping the rotated token here lets the
        // session renew silently instead of logging the office out mid-shift.
        if (refreshToken) localStorage.setItem('hapcargo_refresh_token', refreshToken);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('hapcargo_token');
        localStorage.removeItem('hapcargo_refresh_token');
        useFormStore.getState().clearAllForms();
        set({ user: null, token: null });
      },
    }),
    { name: 'hapcargo_auth' }
  )
);
