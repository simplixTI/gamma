import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, CreditCard, Eye, EyeOff, Camera, Ship, Anchor, ImagePlus, FileText, Upload, CheckCircle2 } from 'lucide-react';
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
  boatType: z.string().min(1, 'Tipo de barco é obrigatório'),
  boatIdentification: z.string().min(1, 'Identificação do barco é obrigatória'),
});

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const PilotAuth = () => {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithEmail, signInWithGoogle, uploadPhoto, loading, user, role } = useAuthContext();

  // Redirect once auth + role are fully resolved
  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === 'pilot' ? '/pilot' : '/passenger', { replace: true });
    }
  }, [loading, user, role, navigate]);
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [boatPhotos, setBoatPhotos] = useState<File[]>([]);
  const [boatPhotoPreviews, setBoatPhotoPreviews] = useState<string[]>([]);

  // Documents — one file per document type
  const [docFiles, setDocFiles] = useState<Partial<Record<string, File>>>({});
  
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
  const [boatType, setBoatType] = useState('');
  const [boatIdentification, setBoatIdentification] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBoatPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + boatPhotos.length > 5) {
      toast.error('Máximo de 5 fotos do barco');
      return;
    }
    
    setBoatPhotos([...boatPhotos, ...files]);
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setBoatPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeBoatPhoto = (index: number) => {
    setBoatPhotos(boatPhotos.filter((_, i) => i !== index));
    setBoatPhotoPreviews(boatPhotoPreviews.filter((_, i) => i !== index));
  };

  const handleDocChange = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10 MB por documento.');
      return;
    }
    setDocFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const handleSignUp = async () => {
    try {
      if (!acceptedTerms || !acceptedPrivacy) {
        toast.error('Você precisa aceitar os termos de uso e política de privacidade');
        return;
      }

      const validation = signUpSchema.safeParse({
        fullName,
        phone,
        email,
        cpf,
        password,
        boatType,
        boatIdentification,
      });
      
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);

      const data = await signUpWithEmail(email, password, 'pilot', {
        fullName,
        phone: phone.replace(/\D/g, ''),
        cpf: cpf.replace(/\D/g, ''),
        boatType,
        boatIdentification,
      });

      // Upload boat photos after account creation
      if (boatPhotos.length > 0 && data?.user?.id) {
        const uploadedUrls: string[] = [];
        for (const photo of boatPhotos) {
          try {
            const photoUrl = await uploadPhoto(photo, 'boat-photos');
            uploadedUrls.push(photoUrl);
          } catch (photoErr) {
            console.warn('Boat photo upload failed:', photoErr);
          }
        }
        if (uploadedUrls.length > 0) {
          const { supabase: sb } = await import('@/integrations/supabase/client');
          await sb.from('pilot_profiles').update({ boat_photos: uploadedUrls }).eq('user_id', data.user.id);
        }
      }

      // Upload pilot documents to pilot-documents bucket
      const docEntries = Object.entries(docFiles);
      if (docEntries.length > 0 && data?.user?.id) {
        const { supabase: sb } = await import('@/integrations/supabase/client');
        // Get pilot_profiles.id for this user
        const { data: pp } = await sb.from('pilot_profiles').select('id').eq('user_id', data.user.id).single();
        if (pp?.id) {
          for (const [docType, file] of docEntries) {
            try {
              const ext = file.name.split('.').pop() ?? 'bin';
              const storagePath = `${data.user.id}/${docType}.${ext}`;
              const { data: uploadData, error: uploadErr } = await sb.storage
                .from('pilot-documents')
                .upload(storagePath, file, { contentType: file.type, upsert: true });
              if (uploadErr) { console.warn(`Doc upload failed (${docType}):`, uploadErr); continue; }
              await sb.from('pilot_documents').upsert({
                pilot_id: pp.id,
                user_id: data.user.id,
                document_type: docType,
                storage_path: uploadData.path,
                file_name: file.name,
                mime_type: file.type,
                file_size_bytes: file.size,
              }, { onConflict: 'pilot_id,document_type' });
            } catch (docErr) { console.warn(`Doc insert failed (${docType}):`, docErr); }
          }
          // Mark as under_review if all required docs are present
          const REQUIRED = ['rg_front', 'rg_back', 'carta_nautica', 'boat_registration', 'proof_of_residence', 'selfie'];
          const hasAll = REQUIRED.every((t) => docFiles[t]);
          if (hasAll) {
            await sb.from('pilot_profiles').update({
              approval_status: 'under_review',
              submitted_at: new Date().toISOString(),
            }).eq('id', pp.id);
          }
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
      // Navigation handled by useEffect once role resolves — do NOT navigate() here.
    } catch (error: any) {
      console.error('SignIn error:', error);
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        toast.error(error.message || 'Erro ao fazer login');
      }
      setIsSubmitting(false);
    }
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
        redirectTo: `${window.location.origin}/auth/pilot?mode=reset`,
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
            {mode === 'login' ? 'Entrar como Piloto' : mode === 'register' ? 'Cadastro de Piloto' : 'Recuperar Senha'}
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto pb-8">
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
                  onClick={() => signInWithGoogle('pilot')}
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
                <p className="text-center text-sm text-muted-foreground">Sua Foto (opcional)</p>

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
                    />
                  </div>
                  {cpf.replace(/\D/g, '').length === 11 && !validateCPF(cpf) && (
                    <p className="text-xs text-destructive">CPF inválido</p>
                  )}
                </div>

                {/* Boat Information Section */}
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Ship className="w-5 h-5 text-primary" />
                    Informações do Barco
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="boatType">Tipo de Barco</Label>
                      <div className="relative">
                        <Ship className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="boatType"
                          placeholder="Ex: Lancha, Barco a motor"
                          value={boatType}
                          onChange={(e) => setBoatType(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="boatIdentification">Identificação do Barco</Label>
                      <div className="relative">
                        <Anchor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="boatIdentification"
                          placeholder="Número de registro ou nome"
                          value={boatIdentification}
                          onChange={(e) => setBoatIdentification(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Boat Photos */}
                    <div className="space-y-2">
                      <Label>Fotos do Barco (opcional, até 5)</Label>
                      <div className="flex flex-wrap gap-2">
                        {boatPhotoPreviews.map((preview, index) => (
                          <div key={index} className="relative w-16 h-16">
                            <img
                              src={preview}
                              alt={`Barco ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeBoatPhoto(index)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {boatPhotos.length < 5 && (
                          <label className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleBoatPhotosChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documentos para Aprovação
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Envie os documentos abaixo para análise do administrador. Formatos aceitos: JPG, PNG, PDF (máx. 10 MB).
                  </p>

                  <div className="space-y-3">
                    {([
                      { key: 'rg_front', label: 'RG — Frente *', required: true },
                      { key: 'rg_back', label: 'RG — Verso *', required: true },
                      { key: 'cnh', label: 'CNH (opcional)', required: false },
                      { key: 'proof_of_residence', label: 'Comprovante de Residência *', required: true },
                      { key: 'selfie', label: 'Selfie com documento *', required: true },
                      { key: 'carta_nautica', label: 'Carta Náutica / Habilitação Náutica *', required: true },
                      { key: 'boat_registration', label: 'Documentação do Barco (PROA) *', required: true },
                    ] as { key: string; label: string; required: boolean }[]).map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <label className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleDocChange(key, e)}
                            className="hidden"
                          />
                          {docFiles[key] ? (
                            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                          ) : (
                            <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{label}</p>
                            {docFiles[key] ? (
                              <p className="text-xs text-success truncate">{(docFiles[key] as File).name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Toque para selecionar</p>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    * Obrigatório para aprovação. Você pode continuar sem enviar agora e enviar depois pelo perfil.
                  </p>
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

export default PilotAuth;
