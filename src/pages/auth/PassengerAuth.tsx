import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, CreditCard, Eye, EyeOff, Camera, Gift } from 'lucide-react';
import SimplixFooter from '@/components/SimplixFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import TermsModal from '@/components/TermsModal';
import { z } from 'zod';
import { validateCPF, formatCPF, formatPhone } from '@/utils/validators';

const signUpSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  cpf: z.string().refine((val) => validateCPF(val), { message: 'CPF inválido' }),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const PassengerAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUpWithEmail, signInWithEmail, signInWithGoogle, uploadPhoto, loading, user, role } = useAuthContext();

  // Redirect once auth + role are fully resolved
  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === 'passenger' ? '/passenger' : '/pilot', { replace: true });
    }
  }, [loading, user, role, navigate]);
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(() =>
    searchParams.get('ref') ? 'register' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Terms and Privacy
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [referralCode, setReferralCode] = useState(() => searchParams.get('ref') ?? '');


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSignUp = async () => {
    try {
      if (!acceptedTerms || !acceptedPrivacy) {
        toast.error('Você precisa aceitar os termos de uso e política de privacidade');
        return;
      }

      const validation = signUpSchema.safeParse({ fullName, phone, email, cpf, password });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);

      // Validate referral code before creating account (if provided)
      if (referralCode.trim()) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: referrer, error: referralErr } = await supabase
          .from('passenger_profiles')
          .select('id')
          .eq('referral_code', referralCode.trim().toUpperCase())
          .maybeSingle();

        if (referralErr || !referrer) {
          toast.error('Código de indicação inválido. Verifique e tente novamente.');
          setIsSubmitting(false);
          return; // Stop before creating account
        }
      }

      const data = await signUpWithEmail(email, password, 'passenger', {
        fullName,
        phone: phone.replace(/\D/g, ''),
        cpf: cpf.replace(/\D/g, ''),
      });

      // Upload photo if selected
      if (photoFile && data?.user?.id) {
        try {
          const photoUrl = await uploadPhoto(photoFile, 'avatars');
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase
            .from('passenger_profiles')
            .update({ photo_url: photoUrl })
            .eq('user_id', data.user.id);
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
          // Non-fatal: account created, photo just won't be set
        }
      }

      // Redeem referral code if provided — only store the referrer link.
      // The discount (30% off) is granted to the referrer AFTER the referred user
      // completes their first ride, via grantReferralDiscount() in Completed.tsx.
      if (referralCode.trim() && data?.user?.id) {
        const { supabase } = await import('@/integrations/supabase/client');
        const code = referralCode.trim().toUpperCase();
        const { data: referrer } = await supabase
          .from('passenger_profiles')
          .select('user_id')
          .eq('referral_code', code)
          .maybeSingle();
        if (referrer && referrer.user_id !== data.user.id) {
          await supabase
            .from('passenger_profiles')
            .update({ referred_by: code })
            .eq('user_id', data.user.id);
          toast.success('Código de indicação aplicado! Seu amigo ganha 30% off após sua primeira corrida.');
        } else if (!referrer) {
          toast.error('Código de indicação não encontrado. Conta criada sem o código.');
        }
      }

      toast.success('Conta criada! Verifique seu email para confirmar.');
      setMode('login');
    } catch (error: any) {
      console.error('SignUp error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    try {
      const validation = signInSchema.safeParse({ email, password });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);
      await signInWithEmail(email, password);
      toast.success('Login realizado!');
      // Navigation is handled by the useEffect below once role is resolved.
      // Do NOT call navigate() here — it races against fetchUserRole.
    } catch (error: any) {
      console.error('SignIn error:', error);
      const msg: string = error.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('user_not_found') || msg.includes('invalid_credentials')) {
        // Check if the email exists at all — if not, guide to register
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: profile } = await supabase
          .from('passenger_profiles')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();
        if (!profile) {
          toast.error('Email não cadastrado. Crie uma conta!', { duration: 4000 });
          setMode('register');
        } else {
          toast.error('Senha incorreta. Esqueceu sua senha?');
        }
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        toast.error(msg || 'Erro ao fazer login');
      }
      setIsSubmitting(false);
    }
    // Note: setIsSubmitting(false) intentionally omitted from finally success path —
    // the spinner stays on while the auth redirect happens to avoid flicker.
  };

  const handleForgotPassword = async () => {
    try {
      if (!email || !z.string().email().safeParse(email).success) {
        toast.error('Digite um email válido');
        return;
      }

      setIsSubmitting(true);
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${(import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin}/auth/passenger?mode=reset`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada e a pasta de spam.', {
        duration: 8000,
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => mode === 'forgot' ? setMode('login') : navigate('/')}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Button>
          <h1 className="text-lg font-semibold">
            {mode === 'login' ? 'Entrar como Passageiro' : mode === 'register' ? 'Criar Conta' : 'Recuperar Senha'}
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center py-8">
          <Logo size="lg" />
        </div>

        {mode === 'forgot' ? (
          /* Forgot Password Form */
          <div className="space-y-4">
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-semibold">Email Enviado!</h2>
                <p className="text-muted-foreground">
                  Enviamos um link de recuperação para <strong>{email}</strong>. 
                  Verifique sua caixa de entrada e spam.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode('login');
                    setResetEmailSent(false);
                  }}
                >
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <>
                <p className="text-center text-muted-foreground mb-6">
                  Digite seu email e enviaremos um link para redefinir sua senha.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode('login')}
                >
                  Voltar ao Login
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={mode === 'login' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('login')}
              >
                Entrar
              </Button>
              <Button
                variant={mode === 'register' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('register')}
              >
                Cadastrar
              </Button>
            </div>

            {mode === 'login' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>

                <Button
                  className="w-full"
                  onClick={handleSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => signInWithGoogle('passenger')}
                  disabled={isSubmitting}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </Button>
              </div>
            ) : (
              /* Registration Form */
              <div className="space-y-4">
                {/* Photo Upload */}
                <div className="flex justify-center">
                  <label className="relative cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                      <Camera className="w-4 h-4" />
                    </span>
                  </label>
                </div>
                <p className="text-center text-sm text-muted-foreground">Foto (opcional)</p>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="João da Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerPhone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="registerPhone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(21) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className="pl-10"
                      inputMode="numeric"
                    />
                  </div>
                  {cpf.replace(/\D/g, '').length === 11 && !validateCPF(cpf) && (
                    <p className="text-xs text-destructive">CPF inválido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerPassword">Senha</Label>
                  <div className="relative">
                    <Input
                      id="registerPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Optional referral code */}
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Código de indicação (opcional)</Label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="referralCode"
                      placeholder="Ex: ABC12345"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 8))}
                      className="pl-10 font-mono tracking-widest"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Se alguém te indicou, o amigo ganha 30% off na próxima corrida</p>
                </div>

                {/* Terms and Privacy Checkboxes */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                      Li e aceito os{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-primary hover:underline font-medium"
                      >
                        Termos de Uso
                      </button>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="privacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                    />
                    <label htmlFor="privacy" className="text-sm text-muted-foreground leading-tight">
                      Li e aceito a{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-primary hover:underline font-medium"
                      >
                        Política de Privacidade
                      </button>
                    </label>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSignUp}
                  disabled={isSubmitting || !acceptedTerms || !acceptedPrivacy}
                >
                  {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou cadastre-se com</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => signInWithGoogle('passenger')}
                  disabled={isSubmitting}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        type="terms"
      />

      {/* Privacy Modal */}
      <TermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        type="privacy"
      />
      <SimplixFooter />
    </div>
  );
};

export default PassengerAuth;
