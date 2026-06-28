import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';

const SetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Detect Supabase auth errors carried in URL hash
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.slice(1));
      const errCode = params.get('error_code');
      const errDesc = params.get('error_description');
      if (errCode === 'otp_expired') {
        setLinkError('Este link de convite expirou ou ja foi usado. Peca a equipe da Gamma para enviar um novo convite.');
      } else if (errCode) {
        setLinkError(decodeURIComponent(errDesc ?? errCode));
      }
      setChecking(false);
      return;
    }

    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session) {
        setHasSession(true);
        setChecking(false);
        return;
      }
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
        if (s && mounted) {
          setHasSession(true);
          setChecking(false);
          sub.subscription.unsubscribe();
        }
      });
      setTimeout(() => {
        if (mounted) {
          setChecking(false);
          sub.subscription.unsubscribe();
        }
      }, 5000);
    };

    verify();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas nao coincidem');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error('Erro ao definir senha: ' + error.message);
      setSaving(false);
      return;
    }
    toast.success('Senha definida! Entrando...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (data?.role === 'pilot') navigate('/pilot', { replace: true });
    else if (data?.role === 'passenger') navigate('/passenger', { replace: true });
    else navigate('/', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-foreground" />
          <p className="text-primary-foreground text-sm font-medium">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (linkError || !hasSession) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">Convite invalido ou expirado</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {linkError ?? 'O link expirou ou ja foi usado. Peca a equipe da Gamma para enviar um novo convite.'}
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Defina sua senha</h1>
          <p className="text-sm text-muted-foreground mt-1">Para concluir o cadastro na Gamma</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pwd" className="text-sm font-medium">Senha</label>
          <div className="relative">
            <input
              id="pwd"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">Confirmar senha</label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Concluir cadastro'}
        </button>
      </form>
    </div>
  );
};

export default SetPassword;
