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

  if (requiredRole && role !== requiredRole) {
    // User is logged in but with wrong role
    const correctPath = role === 'pilot' ? '/pilot' : '/passenger';
    return <Navigate to={correctPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
