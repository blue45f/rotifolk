import { useAuthStore } from '@store/authStore'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

interface Props {
  // DOM 의 role 속성과 혼동되지 않도록 RBAC 권한 prop 은 requiredRole 로 명명한다.
  requiredRole?: 'host' | 'admin'
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { token, user } = useAuthStore()
  const location = useLocation()
  const from = `${location.pathname}${location.search}${location.hash}`

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from }} />
  }
  // host 권한은 자동 부여 (가입 즉시). admin만 명시 체크.
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/me" replace />
  }
  return <Outlet />
}
