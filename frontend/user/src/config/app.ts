import type { AppConfig } from '@/types/app-config'

const legacySettings = (window as any)?.settings

export const appConfig: AppConfig = window.__APP_CONFIG__ ?? {
  apiBase: '/api/v1',
  appName: legacySettings?.title ?? 'V2Board',
  version: legacySettings?.version ?? 'dev',
  theme: {
    color: legacySettings?.theme?.color ?? 'default',
  },
}
