import { create } from 'zustand'
import { getGuestConfig, type GuestConfig } from '@/api/guest'

interface BootstrapState {
  guestConfig: GuestConfig | null
  isLoading: boolean
  isLoaded: boolean
  error: string | null
  loadGuestConfig: () => Promise<void>
}

export const useBootstrapStore = create<BootstrapState>((set, get) => ({
  guestConfig: null,
  isLoading: false,
  isLoaded: false,
  error: null,
  async loadGuestConfig() {
    if (get().isLoading || get().isLoaded) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      const guestConfig = await getGuestConfig()
      set({
        guestConfig,
        isLoading: false,
        isLoaded: true,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load guest config'
      set({
        isLoading: false,
        isLoaded: false,
        error: message,
      })
    }
  },
}))
