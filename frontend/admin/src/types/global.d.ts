export {}

declare global {
  interface Window {
    settings?: {
      title?: string
      host?: string
      version?: string
      background_url?: string
      logo?: string
      secure_path?: string
      theme?: {
        sidebar?: string
        header?: string
        color?: string
      }
    }
    routerBase?: string
  }
}
