import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Ship, CreditCard, Camera, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePilotStats } from '@/hooks/usePilotStats';
import SimplixFooter from '@/components/SimplixFooter';

interface PilotProfile {
  id: string;
  device_id: string;
  name: string;
  phone: string;
  photo_url: string;
  boat_name: string;
  boat_capacity: number;
  license_number: string;
  pix_key: string;
  rating: number;
  total_rides: number;
  total_earnings: number;
  is_verified: boolean;
}

const PilotProfileEdit = () => {
  const navigate = useNavigate();
  const { pilotId, loading: pilotLoading } = usePilotStats();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<PilotProfile>>({
    name: '',
    phone: '',
    boat_name: '',
    boat_capacity: 8,
    license_number: '',
    pix_key: '',
  });
  const [isNewProfile, setIsNewProfile] = useState(false);

  useEffect(() => {
    if (pilotLoading || !pilotId) return;
    fetchProfile();
  }, [pilotId, pilotLoading]);

  const fetchProfile = async () => {
    if (!pilotId) return;
    
    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('id', pilotId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    }

    if (data) {
      setProfile(data);
      setIsNewProfile(false);
    } else {
      setIsNewProfile(true);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!pilotId) {
      toast.error('Erro: Piloto não encontrado');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('pilots')
        .update({
          name: profile.name,
          phone: profile.phone,
          boat_name: profile.boat_name,
          boat_capacity: profile.boat_capacity,
          license_number: profile.license_number,
          pix_key: profile.pix_key,
        })
        .eq('id', pilotId);

      if (error) throw error;
      toast.success('Perfil atualizado!');
      navigate('/pilot');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading || pilotLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/pilot')}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">
            {isNewProfile ? 'Criar Perfil' : 'Editar Perfil'}
          </h1>
        </div>
      </header>

      {/* Profile Photo Section */}
      <div className="flex flex-col items-center py-6 bg-primary/5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
            <Camera className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
        {profile.is_verified && (
          <div className="flex items-center gap-1 mt-2 text-success text-sm">
            <Check className="w-4 h-4" />
            <span>Verificado</span>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Personal Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informações Pessoais
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={profile.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="(21) 99999-9999"
            />
          </div>
        </div>

        {/* Boat Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Ship className="w-4 h-4 text-primary" />
            Informações do Barco
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="boat_name">Nome do Barco</Label>
            <Input
              id="boat_name"
              value={profile.boat_name || ''}
              onChange={(e) => setProfile({ ...profile, boat_name: e.target.value })}
              placeholder="Ex: Lancha Rápida"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="boat_capacity">Capacidade de Passageiros</Label>
            <Input
              id="boat_capacity"
              type="number"
              value={profile.boat_capacity || 8}
              onChange={(e) => setProfile({ ...profile, boat_capacity: parseInt(e.target.value) || 8 })}
              min={1}
              max={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="license">Número da Habilitação Náutica</Label>
            <Input
              id="license"
              value={profile.license_number || ''}
              onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
              placeholder="ARRAIS-AMADOR-XXXXX"
            />
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Dados de Pagamento
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="pix">Chave PIX</Label>
            <Input
              id="pix"
              value={profile.pix_key || ''}
              onChange={(e) => setProfile({ ...profile, pix_key: e.target.value })}
              placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
            />
            <p className="text-xs text-muted">
              Seus ganhos serão enviados para esta chave PIX
            </p>
          </div>
        </div>

        {/* Stats (if not new) */}
        {!isNewProfile && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-foreground mb-3">Estatísticas</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{profile.total_rides || 0}</p>
                <p className="text-xs text-muted">Corridas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  R${(profile.total_earnings || 0).toFixed(0)}
                </p>
                <p className="text-xs text-muted">Ganhos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profile.rating?.toFixed(1) || '5.0'}
                </p>
                <p className="text-xs text-muted">Avaliação</p>
              </div>
            </div>
          </div>
        )}

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
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              {isNewProfile ? 'Criar Perfil' : 'Salvar Alterações'}
            </span>
          )}
        </Button>
      </div>
          <SimplixFooter />
    </div>
  );
};

export default PilotProfileEdit;
