export function PlaceholderPage({
  title,
  description = '该页面正在按原版管理后台逐步对齐，当前已接入壳层、路由与鉴权。',
}: {
  title: string
  description?: string
}) {
  return (
    <div className="block border-bottom">
      <div className="block-header block-header-default">
        <h3 className="block-title">{title}</h3>
      </div>
      <div className="block-content">
        <div className="alert alert-info mb-0" role="alert">
          {description}
        </div>
      </div>
    </div>
  )
}
