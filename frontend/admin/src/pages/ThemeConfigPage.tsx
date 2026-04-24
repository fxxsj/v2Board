import { useEffect, useMemo, useState } from 'react'
import { Drawer, Input, Select, message } from 'antd'
import {
  getAdminThemeConfig,
  getAdminThemes,
  saveAdminConfig,
  saveAdminThemeConfig,
  type AdminThemeMeta,
} from '@/api/admin'

type ThemeConfigModalState = {
  name: string
  themeName: string
  fields: AdminThemeMeta['configs']
  values: Record<string, string>
}

function encodeBase64Json(payload: Record<string, string>) {
  return window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

function ThemeConfigModal({
  open,
  loading,
  state,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  state: ThemeConfigModalState | null
  onCancel: () => void
  onSubmit: (name: string, values: Record<string, string>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !state) return
    setValues(state.values)
  }, [open, state])

  return (
    <Drawer
      className="v2board-theme-config-drawer v2board-editor-drawer"
      title={state ? `配置${state.themeName}主题` : '主题配置'}
      open={open}
      width="80%"
      destroyOnHidden
      onClose={onCancel}
      footer={
        <div className="v2board-drawer-action">
          <button type="button" className="btn btn-alt-secondary mr-2" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !state}
            onClick={async () => {
              if (!state) return
              await onSubmit(state.name, values)
            }}
          >
            提交
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">主题参数</div>
          {(state?.fields ?? []).map((field) => {
            const value = values[field.field_name] ?? field.default_value ?? ''

            return (
              <div key={field.field_name} className="form-group">
                <label className="mb-2">{field.label}</label>
                {field.field_type === 'select' ? (
                  <Select
                    className="w-100"
                    placeholder={field.placeholder}
                    value={value || undefined}
                    onChange={(nextValue) => setValues((current) => ({ ...current, [field.field_name]: nextValue }))}
                    options={Object.entries(field.select_options ?? {}).map(([optionValue, optionLabel]) => ({
                      value: optionValue,
                      label: optionLabel,
                    }))}
                  />
                ) : field.field_type === 'textarea' ? (
                  <Input.TextArea
                    rows={5}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(event) => setValues((current) => ({ ...current, [field.field_name]: event.target.value }))}
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(event) => setValues((current) => ({ ...current, [field.field_name]: event.target.value }))}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Drawer>
  )
}

export function ThemeConfigPage() {
  const [loading, setLoading] = useState(true)
  const [themes, setThemes] = useState<Record<string, AdminThemeMeta>>({})
  const [activeTheme, setActiveTheme] = useState<string>()
  const [configOpen, setConfigOpen] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [configState, setConfigState] = useState<ThemeConfigModalState | null>(null)

  const loadThemes = async () => {
    setLoading(true)
    try {
      const response = await getAdminThemes()
      setThemes(response.themes ?? {})
      setActiveTheme(response.active)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadThemes()
  }, [])

  const themeEntries = useMemo(() => Object.entries(themes), [themes])

  return (
    <>
      <div className="block border-bottom v2board-theme-page">
        <div className="block-content">
          {loading ? (
            <div className="v2board-detail-loading">
              <div className="spinner-grow text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="alert alert-warning mb-0 mb-md-4" role="alert">
                <p className="mb-0">
                  如果采用前后端分离部署，主题配置不会生效。了解
                  <a
                    className="ml-1"
                    href="https://docs.v2board.com/use/advanced.html#%E5%89%8D%E7%AB%AF%E5%88%86%E7%A6%BB"
                    target="_blank"
                    rel="noreferrer"
                  >
                    前后端分离
                  </a>
                </p>
              </div>

              <div className="row v2board-theme-grid">
                {themeEntries.map(([themeKey, theme]) => {
                  const isActive = activeTheme === themeKey
                  return (
                    <div key={themeKey} className="col-lg-6">
                      <div
                        className={`block block-transparent bg-image mb-0 mb-md-3 bg-primary overflow-hidden v2board-theme-card ${isActive ? 'is-active' : ''}`}
                        style={{
                          backgroundImage: theme.images
                            ? `url(${theme.images})`
                            : 'linear-gradient(135deg, rgba(6, 101, 208, 0.92), rgba(31, 41, 55, 0.9))',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        <div
                          className="block-content block-content-full bg-gd-white-op-l v2board-theme-card-overlay"
                          style={{ minHeight: 180 }}
                        >
                          <div className="d-md-flex justify-content-md-between align-items-md-center">
                            <div className="p-2 py-4 v2board-theme-card-body">
                              {isActive ? <span className="badge badge-primary mb-3 v2board-theme-active-badge">当前主题</span> : null}
                              <h3 className="font-size-h4 font-w400 text-black mb-1">{theme.name || themeKey}</h3>
                              <p className="text-black-75 mb-0">{theme.description || '暂无描述'}</p>
                              <div className="font-size-sm text-black-50 mt-2 v2board-theme-version">版本 {theme.version || '-'}</div>
                            </div>
                            <div className="p-2 py-4 v2board-theme-actions">
                              <button
                                type="button"
                                className="btn btn-sm rounded-pill btn-outline-light px-3"
                                disabled={isActive}
                                onClick={async () => {
                                  await saveAdminConfig({ frontend_theme: themeKey })
                                  message.success('主题已切换')
                                  await loadThemes()
                                }}
                              >
                                {isActive ? '当前主题' : '激活主题'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm rounded-pill btn-outline-light px-3"
                                onClick={async () => {
                                  setConfigLoading(true)
                                  try {
                                    const config = await getAdminThemeConfig(themeKey)
                                    setConfigState({
                                      name: themeKey,
                                      themeName: theme.name || themeKey,
                                      fields: theme.configs || [],
                                      values: config || {},
                                    })
                                    setConfigOpen(true)
                                  } finally {
                                    setConfigLoading(false)
                                  }
                                }}
                              >
                                主题设置
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ThemeConfigModal
        open={configOpen}
        loading={configLoading}
        state={configState}
        onCancel={() => {
          setConfigOpen(false)
          setConfigState(null)
        }}
        onSubmit={async (name, values) => {
          setConfigLoading(true)
          try {
            await saveAdminThemeConfig(name, encodeBase64Json(values))
            message.success('保存成功')
            setConfigOpen(false)
            setConfigState(null)
            await loadThemes()
          } finally {
            setConfigLoading(false)
          }
        }}
      />
    </>
  )
}
