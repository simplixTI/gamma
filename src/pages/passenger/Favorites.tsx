import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Trash2, Plus, Home, Briefcase, Loader2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import SimplixFooter from '@/components/SimplixFooter';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'other';
}

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState<'home' | 'work' | 'other'>('other');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('favorite_locations')
        .select('id, name, address, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setFavorites(data as FavoriteLocation[]);
      }
      setLoading(false);
    };
    fetchFavorites();
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('favorite_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Erro ao remover favorito');
      return;
    }
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    toast.success('Local removido dos favoritos');
  };

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!user?.id) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('favorite_locations')
      .insert({ user_id: user.id, name: newName.trim(), address: newAddress.trim() || null, type: newType })
      .select('id, name, address, type')
      .single();
    if (error) {
      toast.error('Erro ao salvar favorito');
      setSaving(false);
      return;
    }
    setFavorites((prev) => [...prev, data as FavoriteLocation]);
    setNewName('');
    setNewAddress('');
    setNewType('other');
    setShowAddForm(false);
    setSaving(false);
    toast.success('Local adicionado aos favoritos');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="w-6 h-6 text-primary" />;
      case 'work': return <Briefcase className="w-6 h-6 text-primary" />;
      default: return <MapPin className="w-6 h-6 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Favoritos</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : favorites.length === 0 && !showAddForm ? (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Nenhum favorito ainda</p>
            <p className="text-muted text-sm">Salve seus locais frequentes para acesso rápido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-card rounded-xl p-4 flex items-center gap-4 border border-border"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {getTypeIcon(favorite.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{favorite.name}</p>
                  {favorite.address && (
                    <p className="text-sm text-muted truncate">{favorite.address}</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover favorito?</AlertDialogTitle>
                      <AlertDialogDescription>
                        «{favorite.name}» será removido dos seus locais favoritos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(favorite.id)}>
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        {/* Inline add form */}
        {showAddForm && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-foreground text-sm">Novo local favorito</p>
              <button onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nome (ex: Casa, Trabalho)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <input
              type="text"
              placeholder="Endereço ou pier (opcional)"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <div className="flex gap-2">
              {(['home', 'work', 'other'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                    newType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  {t === 'home' ? <Home className="w-3.5 h-3.5" /> : t === 'work' ? <Briefcase className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  {t === 'home' ? 'Casa' : t === 'work' ? 'Trabalho' : 'Outro'}
                </button>
              ))}
            </div>
            <Button fullWidth onClick={handleAdd} disabled={saving} className="h-11">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" />Salvar</>}
            </Button>
          </div>
        )}

        {!showAddForm && (
          <Button
            variant="outline"
            fullWidth
            className="border-dashed"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar local favorito
          </Button>
        )}

        <div className="bg-muted/5 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Acesso rápido</p>
              <p className="text-xs text-muted mt-1">
                Locais favoritos aparecem na tela inicial para você solicitar viagens mais rapidamente.
              </p>
            </div>
          </div>
        </div>
      </div>
      <SimplixFooter />
    </div>
  );
};

export default Favorites;
