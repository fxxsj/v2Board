import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicLayout from '@/layouts/PublicLayout'
import AppLayout from '@/layouts/AppLayout'
import HomePage from '@/pages/public/HomePage'
import LoginPage from '@/pages/public/LoginPage'
import RegisterPage from '@/pages/public/RegisterPage'
import ForgotPasswordPage from '@/pages/public/ForgotPasswordPage'
import PlanPage from '@/pages/public/PlanPage'
import DashboardPage from '@/pages/app/DashboardPage'
import ProfilePage from '@/pages/app/ProfilePage'
import TrafficPage from '@/pages/app/TrafficPage'
import TicketPage from '@/pages/app/TicketPage'
import TicketDetailPage from '@/pages/app/TicketDetailPage'
import ServerPage from '@/pages/app/ServerPage'
import InvitePage from '@/pages/app/InvitePage'
import OrderPage from '@/pages/app/OrderPage'
import OrderDetailPage from '@/pages/app/OrderDetailPage'
import KnowledgePage from '@/pages/app/KnowledgePage'
import NotFoundPage from '@/pages/NotFoundPage'
import { useAuthStore } from '@/stores/auth'
import { useBootstrap } from '@/hooks/useBootstrap'

export default function App() {
  useBootstrap()
  const restoreToken = useAuthStore((state) => state.restoreToken)

  useEffect(() => {
    restoreToken()
  }, [restoreToken])

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgetpassword" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/plan/:plan_id" element={<PlanPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/traffic" element={<TrafficPage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/ticket/:ticket_id" element={<TicketDetailPage />} />
          <Route path="/node" element={<ServerPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order/:trade_no" element={<OrderDetailPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
