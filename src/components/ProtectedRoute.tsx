import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'passenger' | 'pilot';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, role } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate auth page based on the route they're trying to access
    const authPath = location.pathname.startsWith('/pilot') 
      ? '/auth/pilot' 
      : '/auth/passenger';
    return <Navigate to={authPath} state={{ from: location }} replace />;
  }

  // If a specific role is required and the role has been resolved but doesn't match,
  // redirect. We also wait for role to be non-null before allowing access, which
  // prevents the brief window where user is set but role is still loading (null).
  if (requiredRole) {
    if (role === null) {
      if (!loading) {
        // Auth finished but no role found — user has no profile yet, send to auth
        const authPath = location.pathname.startsWith('/pilot')
          ? '/auth/pilot'
          : '/auth/passenger';
        return <Navigate to={authPath} state={{ from: location }} replace />;
      }
      // Role still loading — show spinner
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    if (role !== requiredRole) {
      // User is logged in but with wrong role — send to their own dashboard
      const correctPath = role === 'pilot' ? '/pilot' : '/passenger';
      // Only redirect if we're not already on their correct path (prevents loop)
      if (!location.pathname.startsWith(correctPath)) {
        return <Navigate to={correctPath} replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
