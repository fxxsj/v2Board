import { useEffect } from 'react'
import { useUserStore } from '@/stores/user'

export function useUserInfo() {
  const userInfo = useUserStore((state) => state.userInfo)
  const isLoading = useUserStore((state) => state.isLoading)
  const error = useUserStore((state) => state.error)
  const loadUserInfo = useUserStore((state) => state.loadUserInfo)
  const refreshUserInfo = useUserStore((state) => state.refreshUserInfo)

  useEffect(() => {
    void loadUserInfo()
  }, [loadUserInfo])

  return {
    userInfo,
    isLoading,
    error,
    refreshUserInfo,
  }
}

