import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { OrderPage } from '@/pages/OrderPage'
import { PaymentPage } from '@/pages/PaymentPage'
import { PlanPage } from '@/pages/PlanPage'
import { CouponPage } from '@/pages/CouponPage'
import { GiftcardPage } from '@/pages/GiftcardPage'
import { KnowledgePage } from '@/pages/KnowledgePage'
import { ServerGroupPage } from '@/pages/ServerGroupPage'
import { ServerManagePage } from '@/pages/ServerManagePage'
import { ServerRoutePage } from '@/pages/ServerRoutePage'
import { NoticePage } from '@/pages/NoticePage'
import { QueuePage } from '@/pages/QueuePage'
import { SystemConfigPage } from '@/pages/SystemConfigPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { TicketPage } from '@/pages/TicketPage'
import { ThemeConfigPage } from '@/pages/ThemeConfigPage'
import { UserPage } from '@/pages/UserPage'
import { RequireAuth } from '@/components/RequireAuth'
import { useAuthStore } from '@/stores/auth'

function Bootstrapper() {
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return null
}

function HomeRedirect() {
  const authenticated = useAuthStore((state) => state.authenticated)
  const initializing = useAuthStore((state) => state.initializing)

  if (initializing) return null
  return <Navigate to={authenticated ? '/dashboard' : '/login'} replace />
}

function LoginRoute() {
  const authenticated = useAuthStore((state) => state.authenticated)
  const initializing = useAuthStore((state) => state.initializing)

  if (initializing) return null
  return authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

export default function App() {
  return (
    <>
      <Bootstrapper />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginRoute />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/config/system" element={<SystemConfigPage />} />
          <Route path="/config/payment" element={<PaymentPage />} />
          <Route path="/config/theme" element={<ThemeConfigPage />} />
          <Route path="/server/manage" element={<ServerManagePage />} />
          <Route path="/server/group" element={<ServerGroupPage />} />
          <Route path="/server/route" element={<ServerRoutePage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/coupon" element={<CouponPage />} />
          <Route path="/giftcard" element={<GiftcardPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/ticket/:ticket_id" element={<TicketDetailPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </>
  )
}
