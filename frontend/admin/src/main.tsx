import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { HashRouter } from 'react-router-dom'
import App from '@/App'
import { ensureThemeStylesheet, initializeDarkMode } from '@/config/theme'
import '@/styles/custom.css'

ensureThemeStylesheet()
initializeDarkMode()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ConfigProvider locale={zhCN}>
    <HashRouter>
      <App />
    </HashRouter>
  </ConfigProvider>,
)
