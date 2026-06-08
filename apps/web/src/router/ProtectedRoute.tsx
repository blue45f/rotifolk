import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'

interface Props {
  role?: 'host' | 'admin'
}

export default function ProtectedRoute({ role }: Props) {
  const { token, user } = useAuthStore()
  const location = useLocation()
  const from = `${location.pathname}${location.search}${location.hash}`

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from }} />
  }
  // host 권한은 자동 부여 (가입 즉시). admin만 명시 체크.
  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/me" replace />
  }
  return <Outlet />
}
