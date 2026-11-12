import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { AdminRole } from '../services/types'

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { ready, session, profile } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="auth-loading" aria-label="Loading secure workspace"><span className="auth-spinner"/><span>Preparing your workspace…</span></div>
  if (!session || !profile || !profile.active) return <Navigate to="/login" replace state={{ from: location.pathname }}/>
  return children ?? <Outlet />
}
export function RoleGuard({ allowed, children }: { allowed: AdminRole[]; children?: ReactNode }) {
  const { role } = useAuth()
  if (!role || (role !== 'super_admin' && !allowed.includes(role))) return <Navigate to="/" replace />
  return children ?? <Outlet />
}
