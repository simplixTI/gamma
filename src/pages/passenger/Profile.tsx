import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, CreditCard, Camera,
  Save, Loader2, Star, ChevronRight, History, Wallet,
  HelpCircle, Shield, Gift, Settings, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';
import { toast } from 'sonner';
import SimplixFooter from '@/components/SimplixFooter';

const menuItems = [
  { icon: History,    label: 'Histórico de Viagens', path: '/passenger/history' },
  { icon: Wallet,     label: 'Carteira',              path: '/passenger/wallet' },
  { icon: Settings,   label: 'Configurações',         path: '/passenger/settings' },
  { icon: HelpCircle, label: 'Ajuda',                 path: '/passenger/help' },
];

const Profile = () => {
  const navigate = useNavigate();
  const { passengerProfile, user, uploadPhoto, updatePassengerProfile, loading, signOut } = useAuthContext();
  const { referralCode, hasDiscount, pendingDiscounts } = useReferral(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [cpf, setCpf]               = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving]     = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [editMode, setEditMode]     = useState(false);

  useEffect(() => {
    if (passengerProfile) {
      setFullName(passengerProfile.full_name || '');
      setPhone(passengerProfile.phone || '');
      setEmail(passengerProfile.email || '');
      setCpf(passengerProfile.cpf || '');
      setPhotoPreview(passengerProfile.photo_url || null);
    }
  }, [passengerProfile]);

  const formatCpf = (value: string) => {
    const n = value.replace(/\D/g, '');
    return n.replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
  };

  const formatPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    return n.replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setIsUploadingPhoto(true);
    try {
      const photoUrl = await uploadPhoto(file, 'avatars');
      await updatePassengerProfile({ photo_url: photoUrl });
      toast.success('Foto atualizada!');
    } catch {
      toast.error('Erro ao enviar foto');
      setPhotoPreview(passengerProfile?.photo_url || null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('Nome é obrigatório'); return; }
    setIsSaving(true);
    try {
      await updatePassengerProfile({
        full_name: fullName.trim(),
        phone: phone.replace(/\D/g, ''),
        cpf: cpf.replace(/\D/g, ''),
      });
      toast.success('Perfil atualizado!');
      setEditMode(false);
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
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
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Conta</h1>
          </div>
          {editMode ? (
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
              Editar
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto pb-8">
        {/* Hero: name + avatar + rating */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shadow">
                {isUploadingPhoto ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                ) : photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-9 h-9 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground truncate">
                {passengerProfile?.full_name || 'Passageiro'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {passengerProfile?.rating !== undefined && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-sm">{Number(passengerProfile.rating).toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-primary">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Verificado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral banner */}
        <div className="px-4 mb-4">
          <button
            onClick={() => navigate('/passenger/referral')}
            className="w-full bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 rounded-2xl p-3.5 flex items-center gap-3 active:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-foreground text-sm">
                {hasDiscount
                  ? `🎉 ${pendingDiscounts.length} desconto${pendingDiscounts.length > 1 ? 's' : ''} de 30% disponível!`
                  : 'Indique amigos, ganhe 30% off'}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {referralCode ? `Código: ${referralCode}` : 'Carregando código...'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
        </div>

        {/* Edit form (visible only in editMode) */}
        {editMode && (
          <div className="px-4 mb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="fullName" placeholder="Seu nome completo" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="(21) 99999-9999"
                  value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} disabled className="pl-10 bg-muted/50" />
              </div>
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="cpf" placeholder="000.000.000-00"
                  value={formatCpf(cpf)} onChange={(e) => setCpf(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
        )}

        {/* Menu grid — Uber style */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 text-left active:bg-muted/10 transition-colors"
              >
                <div className="w-10 h-10 bg-muted/10 rounded-xl flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="font-medium text-sm text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="px-4 mb-4">
          <div className="bg-muted/20 rounded-2xl p-4">
            <h3 className="font-semibold text-sm text-foreground mb-2">Informações da Conta</h3>
            <p className="text-sm text-muted-foreground">
              Membro desde: {passengerProfile?.created_at
                ? new Date(passengerProfile.created_at).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 mb-2">
          <button
            onClick={async () => {
              try {
                await signOut();
                navigate('/');
              } catch {
                // error toast handled inside signOut
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive active:opacity-80 transition-opacity"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Sair da conta</span>
          </button>
        </div>
      </div>

      <SimplixFooter />
    </div>
  );
};

export default Profile;
