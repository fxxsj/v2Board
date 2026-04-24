import { Result } from 'antd'
import i18n from '@/i18n'

export default function NotFoundPage() {
  return <Result status="404" title="404" subTitle={i18n.t('页面不存在。')} />
}
