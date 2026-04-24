const settings = window.settings ?? {}
const origin = new URL(window.location.href).origin
const host = settings.host?.trim() ? settings.host : origin

export const appConfig = {
  appName: settings.title ?? 'V2Board',
  version: settings.version ?? '1.7.5',
  apiBase: `${host}/api/v1`,
  backgroundUrl: settings.background_url ?? '',
  logo: settings.logo ?? '',
  securePath: (settings.secure_path ?? 'admin').replace(/\//g, ''),
  theme: {
    sidebar: settings.theme?.sidebar ?? 'light',
    header: settings.theme?.header ?? 'dark',
    color: settings.theme?.color ?? 'default',
  },
}
