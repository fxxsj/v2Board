import { create } from 'zustand'

export const AUTH_TOKEN_STORAGE_KEY = 'auth_data'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  restoreToken: () => void
  setToken: (token: string | null) => void
}

const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)

const initialToken = getStoredToken()

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  isAuthenticated: Boolean(initialToken),
  restoreToken: () => {
    const token = getStoredToken()
    set({ token, isAuthenticated: Boolean(token) })
  },
  setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
}))
