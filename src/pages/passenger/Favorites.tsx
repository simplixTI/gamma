import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Trash2, Plus, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SimplixFooter from '@/components/SimplixFooter';

interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'other';
}

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([
    { id: '1', name: 'Casa', address: 'Ilha da Gigoia - Rua Principal', type: 'home' },
    { id: '2', name: 'Trabalho', address: 'Barra da Tijuca - Av. das Américas', type: 'work' },
  ]);

  const handleDelete = (id: string) => {
    setFavorites(favorites.filter(f => f.id !== id));
    toast.success('Local removido dos favoritos');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="w-6 h-6 text-primary" />;
      case 'work':
        return <Briefcase className="w-6 h-6 text-primary" />;
      default:
        return <MapPin className="w-6 h-6 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Favoritos</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhum favorito ainda
            </p>
            <p className="text-muted text-sm">
              Salve seus locais frequentes para acesso rápido
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-card rounded-xl p-4 flex items-center gap-4 border border-border"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {getTypeIcon(favorite.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{favorite.name}</p>
                  <p className="text-sm text-muted truncate">{favorite.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(favorite.id)}
                  className="text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Favorite Button */}
        <Button
          variant="outline"
          fullWidth
          className="border-dashed"
          onClick={() => toast.info('Em breve: adicionar local favorito')}
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar local favorito
        </Button>

        {/* Info */}
        <div className="bg-muted/5 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Acesso rápido</p>
              <p className="text-xs text-muted mt-1">
                Locais favoritos aparecem na tela inicial para você 
                solicitar viagens mais rapidamente.
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
