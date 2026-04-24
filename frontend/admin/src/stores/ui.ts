import { create } from 'zustand'

interface UiState {
  showNav: boolean
  toggleNav: () => void
  closeNav: () => void
}

export const useUiStore = create<UiState>((set) => ({
  showNav: false,
  toggleNav: () => set((state) => ({ showNav: !state.showNav })),
  closeNav: () => set({ showNav: false }),
}))
