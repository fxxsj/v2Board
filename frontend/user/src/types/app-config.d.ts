export interface AppConfig {
  apiBase: string
  appName: string
  version: string
  theme?: {
    color?: string
  }
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig
  }
}
