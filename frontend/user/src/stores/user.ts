import { create } from 'zustand'
import { getUserInfo, type UserInfo } from '@/api/user'

interface UserInfoState {
  userInfo: UserInfo | null
  isLoading: boolean
  isLoaded: boolean
  error: string | null
  loadUserInfo: () => Promise<void>
  refreshUserInfo: () => Promise<void>
  clearUserInfo: () => void
}

export const useUserStore = create<UserInfoState>((set, get) => ({
  userInfo: null,
  isLoading: false,
  isLoaded: false,
  error: null,
  async loadUserInfo() {
    if (get().isLoading || get().isLoaded) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      const userInfo = await getUserInfo()
      set({
        userInfo,
        isLoading: false,
        isLoaded: true,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user info'
      set({
        userInfo: null,
        isLoading: false,
        isLoaded: false,
        error: message,
      })
    }
  },
  async refreshUserInfo() {
    if (get().isLoading) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      const userInfo = await getUserInfo()
      set({
        userInfo,
        isLoading: false,
        isLoaded: true,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user info'
      set({
        userInfo: null,
        isLoading: false,
        isLoaded: false,
        error: message,
      })
    }
  },
  clearUserInfo: () =>
    set({
      userInfo: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    }),
}))

