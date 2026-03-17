import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Ship, CreditCard, Camera, Save, Check, Star, X, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import SimplixFooter from '@/components/SimplixFooter';

const PilotProfile = () => {
  const navigate = useNavigate();
  const { pilotProfile, updatePilotProfile, uploadPhoto, loading } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boatPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBoatPhoto, setUploadingBoatPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    cpf: '',
    boat_type: '',
    boat_identification: '',
    pix_key: '',
  });

  // Sync form state with profile data when loaded
  useEffect(() => {
    if (pilotProfile) {
      setFormData({
        full_name: pilotProfile.full_name || '',
        phone: pilotProfile.phone || '',
        email: pilotProfile.email || '',
        cpf: pilotProfile.cpf || '',
        boat_type: pilotProfile.boat_type || '',
        boat_identification: pilotProfile.boat_identification || '',
        pix_key: pilotProfile.pix_key || '',
      });
    }
  }, [pilotProfile]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadPhoto(file, 'avatars');
      await updatePilotProfile({ photo_url: photoUrl });
      toast.success('Foto atualizada!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleBoatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ((pilotProfile?.boat_photos?.length || 0) >= 5) {
      toast.error('Máximo de 5 fotos do barco');
      return;
    }

    setUploadingBoatPhoto(true);
    try {
      const photoUrl = await uploadPhoto(file, 'boat-photos');
      const currentPhotos = pilotProfile?.boat_photos || [];
      await updatePilotProfile({ boat_photos: [...currentPhotos, photoUrl] });
      toast.success('Foto do barco adicionada!');
    } catch (error) {
      console.error('Error uploading boat photo:', error);
      toast.error('Erro ao enviar foto do barco');
    } finally {
      setUploadingBoatPhoto(false);
    }
  };

  const handleRemoveBoatPhoto = async (index: number) => {
    const currentPhotos = pilotProfile?.boat_photos || [];
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    await updatePilotProfile({ boat_photos: newPhotos });
    toast.success('Foto removida');
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.pix_key.trim()) {
      toast.error('Chave PIX é obrigatória para receber seus ganhos');
      // Don't block save, but show warning — pilot can still save without it
    }

    setSaving(true);
    try {
      await updatePilotProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        cpf: formData.cpf,
        boat_type: formData.boat_type,
        boat_identification: formData.boat_identification,
        pix_key: formData.pix_key,
      });
      toast.success('Perfil atualizado!');
      navigate(-1);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-safe">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      <input
        ref={boatPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBoatPhotoUpload}
      />

      {/* Header */}
      <header className="bg-primary text-primary-foreground safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Meu Perfil</h1>
        </div>
      </header>

      {/* Profile Photo Section */}
      <div className="flex flex-col items-center py-6 bg-primary/5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
            {uploadingPhoto ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : pilotProfile?.photo_url ? (
              <img src={pilotProfile.photo_url} alt="Foto" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md"
          >
            <Camera className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
        {pilotProfile?.is_verified && (
          <div className="flex items-center gap-1 mt-2 text-success text-sm">
            <Check className="w-4 h-4" />
            <span>Verificado</span>
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-warning">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold text-lg">{pilotProfile?.rating?.toFixed(1) || '5.0'}</span>
            </div>
            <p className="text-xs text-muted-foreground">Avaliação</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{pilotProfile?.total_rides || 0}</p>
            <p className="text-xs text-muted-foreground">Corridas</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-success">
              R${(pilotProfile?.total_earnings || 0).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Ganhos</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Personal Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4 border border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informações Pessoais
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(21) 99999-9999"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
        </div>

        {/* Boat Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4 border border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Ship className="w-4 h-4 text-primary" />
            Informações do Barco
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="boat_type">Tipo de Barco</Label>
            <Input
              id="boat_type"
              value={formData.boat_type}
              onChange={(e) => setFormData({ ...formData, boat_type: e.target.value })}
              placeholder="Ex: Lancha, Bote, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="boat_identification">Identificação do Barco</Label>
            <Input
              id="boat_identification"
              value={formData.boat_identification}
              onChange={(e) => setFormData({ ...formData, boat_identification: e.target.value })}
              placeholder="Número de registro ou nome"
            />
          </div>

          {/* Boat Photos */}
          <div className="space-y-2">
            <Label>Fotos do Barco (até 5)</Label>
            <div className="flex flex-wrap gap-2">
              {pilotProfile?.boat_photos?.map((photo, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img src={photo} alt={`Barco ${index + 1}`} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                  <button
                    onClick={() => handleRemoveBoatPhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              {(pilotProfile?.boat_photos?.length || 0) < 5 && (
                <button
                  onClick={() => boatPhotoInputRef.current?.click()}
                  disabled={uploadingBoatPhoto}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
                >
                  {uploadingBoatPhoto ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4 border border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Dados de Pagamento
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="pix_key">Chave PIX *</Label>
            <Input
              id="pix_key"
              value={formData.pix_key}
              onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
              placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
            />
            {!formData.pix_key && (
              <p className="text-xs text-warning flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                Sem chave PIX você não poderá receber seus ganhos
              </p>
            )}
            {formData.pix_key && (
              <p className="text-xs text-muted-foreground">
                Seus ganhos serão enviados para esta chave PIX
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button
          fullWidth
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="h-14"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              Salvar Alterações
            </span>
          )}
        </Button>
      </div>
      <SimplixFooter />
    </div>
  );
};

export default PilotProfile;