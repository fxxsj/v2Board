import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function RequireAuth({ children }: { children: JSX.Element }) {
  const authenticated = useAuthStore((state) => state.authenticated)
  const initializing = useAuthStore((state) => state.initializing)
  const location = useLocation()

  if (initializing) {
    return (
      <div id="page-container">
        <main id="main-container">
          <div className="content content-full text-center pt-5">
            <div className="spinner-grow text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
