import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles the OAuth redirect from Google.
 * Supabase exchanges the code in the URL hash/query params automatically.
 * We wait for the session to be established, then route based on role.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Give Supabase a moment to process the OAuth code from the URL
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // If no session yet, listen for it
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session) {
              subscription.unsubscribe();
              await redirectByRole(session.user.id);
            }
          }
        );
        return;
      }

      await redirectByRole(session.user.id);
    };

    const redirectByRole = async (userId: string) => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (data?.role === 'pilot') {
        navigate('/pilot', { replace: true });
      } else if (data?.role === 'passenger') {
        navigate('/passenger', { replace: true });
      } else {
        // Role not yet created (createOAuthProfile is running in useAuth)
        // Check pending_oauth_role from sessionStorage (set in useAuth signInWithGoogle)
        const pendingRole = sessionStorage.getItem('pending_oauth_role');
        // Wait briefly and retry
        setTimeout(async () => {
          const { data: retryData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

          if (retryData?.role === 'pilot') {
            navigate('/pilot', { replace: true });
          } else if (retryData?.role === 'passenger') {
            navigate('/passenger', { replace: true });
          } else if (pendingRole === 'pilot') {
            navigate('/pilot', { replace: true });
          } else if (pendingRole === 'passenger') {
            navigate('/passenger', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 1500);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-foreground" />
        <p className="text-primary-foreground text-sm font-medium">Entrando com Google...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
