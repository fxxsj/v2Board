import { create } from 'zustand'
import { checkLogin, loginWithPassword } from '@/api/auth'
import { clearAuthToken, getAuthToken, setAuthToken } from '@/api/client'
import { getUserInfo, type UserInfo } from '@/api/user'

interface AuthState {
  initializing: boolean
  authenticated: boolean
  loginLoading: boolean
  userInfo: UserInfo | null
  bootstrap: () => Promise<boolean>
  fetchUserInfo: () => Promise<UserInfo | null>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initializing: true,
  authenticated: false,
  loginLoading: false,
  userInfo: null,

  async bootstrap() {
    if (!getAuthToken()) {
      set({ initializing: false, authenticated: false, userInfo: null })
      return false
    }

    try {
      const result = await checkLogin()
      if (!result.is_login || !result.is_admin) {
        clearAuthToken()
        set({ initializing: false, authenticated: false, userInfo: null })
        return false
      }

      await get().fetchUserInfo()
      set({ initializing: false, authenticated: true })
      return true
    } catch {
      clearAuthToken()
      set({ initializing: false, authenticated: false, userInfo: null })
      return false
    }
  },

  async fetchUserInfo() {
    try {
      const userInfo = await getUserInfo()
      set({ userInfo, authenticated: true })
      return userInfo
    } catch {
      set({ userInfo: null, authenticated: false })
      return null
    }
  },

  async login(email, password) {
    set({ loginLoading: true })
    try {
      const data = await loginWithPassword({ email, password })
      if (!data.is_admin) {
        clearAuthToken()
        set({ loginLoading: false, authenticated: false, userInfo: null })
        return false
      }

      setAuthToken(data.auth_data)
      const userInfo = await getUserInfo()
      set({
        loginLoading: false,
        authenticated: true,
        userInfo,
      })
      return true
    } catch {
      clearAuthToken()
      set({ loginLoading: false, authenticated: false, userInfo: null })
      return false
    }
  },

  logout() {
    clearAuthToken()
    set({
      authenticated: false,
      userInfo: null,
      initializing: false,
      loginLoading: false,
    })
  },
}))
