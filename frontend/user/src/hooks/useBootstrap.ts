import { useEffect } from 'react'
import { useBootstrapStore } from '@/stores/bootstrap'

export function useBootstrap() {
  const loadGuestConfig = useBootstrapStore((state) => state.loadGuestConfig)

  useEffect(() => {
    void loadGuestConfig()
  }, [loadGuestConfig])
}
