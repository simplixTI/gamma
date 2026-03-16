import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Handles the OAuth redirect from Google.
 * Supabase exchanges the code in the URL hash/query params automatically.
 * We wait for the session to be established, then route based on role.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const redirectByRole = async (userId: string, attempt = 0) => {
      if (!mountedRef.current) return;

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (!mountedRef.current) return;

        if (data?.role === 'pilot') {
          navigate('/pilot', { replace: true });
        } else if (data?.role === 'passenger') {
          navigate('/passenger', { replace: true });
        } else if (attempt < 5) {
          // Role not yet created — retry with backoff (createOAuthProfile is running in useAuth)
          const delay = Math.min(500 * Math.pow(2, attempt), 4000);
          setTimeout(() => redirectByRole(userId, attempt + 1), delay);
        } else {
          // All retries exhausted
          toast.error('Erro ao completar login. Tente novamente.');
          navigate('/', { replace: true });
        }
      } catch {
        if (mountedRef.current) {
          toast.error('Erro ao verificar conta. Tente novamente.');
          navigate('/', { replace: true });
        }
      }
    };

    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          // If no session yet, listen for it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
              if (newSession) {
                subscription.unsubscribe();
                await redirectByRole(newSession.user.id);
              }
            }
          );
          // Cleanup subscription on unmount
          return () => subscription.unsubscribe();
        }

        await redirectByRole(session.user.id);
      } catch {
        if (mountedRef.current) {
          toast.error('Erro ao processar login. Tente novamente.');
          navigate('/', { replace: true });
        }
      }
    };

    handleCallback();

    return () => { mountedRef.current = false; };
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
