import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer when locked out
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        setCountdown(0);
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isLocked) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockedUntil(until);
          setCountdown(LOCKOUT_SECONDS);
          toast.error(`Muitas tentativas. Tente novamente em ${LOCKOUT_SECONDS} segundos.`);
        } else {
          toast.error(`Credenciais inválidas. ${MAX_ATTEMPTS - next} tentativa(s) restante(s).`);
        }
        return;
      }

      // Verify admin role — must be an active admin or super_admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .in('role', ['admin', 'super_admin'])
        .maybeSingle();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        toast.error('Acesso negado. Você não tem permissão de administrador.');
        return;
      }

      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Gamma</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel de Administração</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gamma.app"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {isLocked && (
            <p className="text-sm text-destructive text-center">
              Conta bloqueada. Tente novamente em {countdown}s.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading || isLocked}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
