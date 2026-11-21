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

/** Absolute deadline of the server session; the TMS is capped at 12 hours. */
export const SESSION_EXPIRES_KEY = 'hapcargo_session_expires_at';

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string, refreshToken?: string, sessionExpiresAt?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token, refreshToken, sessionExpiresAt) => {
        localStorage.setItem('hapcargo_token', token);
        // The TMS and the API live on different hosts, so the refresh cookie can
        // be blocked as third-party. Keeping the rotated token here lets the
        // session renew silently instead of logging the office out mid-shift.
        if (refreshToken) localStorage.setItem('hapcargo_refresh_token', refreshToken);
        if (sessionExpiresAt) localStorage.setItem(SESSION_EXPIRES_KEY, sessionExpiresAt);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('hapcargo_token');
        localStorage.removeItem('hapcargo_refresh_token');
        localStorage.removeItem(SESSION_EXPIRES_KEY);
        useFormStore.getState().clearAllForms();
        set({ user: null, token: null });
      },
    }),
    { name: 'hapcargo_auth' }
  )
);
