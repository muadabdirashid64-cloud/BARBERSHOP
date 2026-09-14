import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/lib/supabase';
import { PageLoader } from '@/components/ui';

export const roleHome: Record<UserRole, string> = {
  super_admin: '/super-admin',
  admin: '/admin',
  cashier: '/cashier',
  barber: '/barber',
  customer: '/customer',
};

export function ProtectedRoute({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { profile, loading, shopActive } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!profile) return <Navigate to="/login" state={{ from: location }} replace />;
  if (profile.role !== role) return <Navigate to={roleHome[profile.role]} replace />;

  if (profile.role !== 'super_admin' && shopActive === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Barber Shop Management System</h2>
          <p className="text-sm text-gray-400">
            Your Barber Shop account is currently inactive. Please contact the system administrator.
          </p>
          <button
            onClick={() => { window.location.href = '/login'; }}
            className="mt-6 rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-6 py-2.5 text-sm font-semibold text-ink-950 transition hover:from-gold-300 hover:to-gold-400"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function MultiRoleRoute({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { profile, loading, shopActive } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!profile) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!roles.includes(profile.role)) return <Navigate to={roleHome[profile.role]} replace />;

  if (profile.role !== 'super_admin' && shopActive === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Barber Shop Management System</h2>
          <p className="text-sm text-gray-400">
            Your Barber Shop account is currently inactive. Please contact the system administrator.
          </p>
          <button
            onClick={() => { window.location.href = '/login'; }}
            className="mt-6 rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-6 py-2.5 text-sm font-semibold text-ink-950 transition hover:from-gold-300 hover:to-gold-400"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (profile) return <Navigate to={roleHome[profile.role]} replace />;
  return <>{children}</>;
}
