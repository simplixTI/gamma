import { useNavigate } from 'react-router-dom';
import { User, History, Wallet, Ship, Settings, HelpCircle, LogOut, X } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats?: {
    ridestoday: number;
    earnings: number;
    rating: number;
  };
}

const menuItems = [
  { icon: User, label: 'Meu Perfil', path: '/pilot/profile/edit' },
  { icon: History, label: 'Histórico de Corridas', path: '/pilot/history' },
  { icon: Wallet, label: 'Ganhos', path: '/pilot/earnings' },
  { icon: Ship, label: 'Meu Barco', path: '/pilot/profile/edit' },
  { icon: Settings, label: 'Configurações', path: '/pilot/settings' },
  { icon: HelpCircle, label: 'Ajuda e Suporte', path: '/pilot/help' },
];

const PilotDrawer = ({ open, onOpenChange, stats }: PilotDrawerProps) => {
  const navigate = useNavigate();
  const { pilotProfile, signOut } = useAuthContext();

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      onOpenChange(false);
      await signOut();
      toast.success('Logout realizado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent direction="left" className="h-full w-[85%] max-w-[320px] rounded-r-xl border-r-0">
        <div className="flex flex-col h-full">
          {/* Header with Stats */}
          <DrawerHeader className="border-b border-border pb-4 bg-primary text-primary-foreground rounded-tr-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                  {pilotProfile?.photo_url ? (
                    <img
                      src={pilotProfile.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Ship className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <DrawerTitle className="text-lg font-semibold text-primary-foreground">
                    {pilotProfile?.full_name?.split(' ')[0] || 'Capitão'}
                  </DrawerTitle>
                  <p className="text-sm opacity-80">Piloto Gamma</p>
                </div>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10">
                  <X className="w-5 h-5" />
                </Button>
              </DrawerClose>
            </div>

            {/* Quick Stats */}
            {stats && (
              <div className="flex items-center justify-around bg-primary-foreground/10 rounded-lg p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{stats.ridestoday}</p>
                  <p className="text-xs opacity-70">Corridas</p>
                </div>
                <div className="w-px h-8 bg-primary-foreground/20" />
                <div className="text-center">
                  <p className="text-lg font-bold">R${stats.earnings.toFixed(0)}</p>
                  <p className="text-xs opacity-70">Hoje</p>
                </div>
                <div className="w-px h-8 bg-primary-foreground/20" />
                <div className="text-center">
                  <p className="text-lg font-bold">{stats.rating}</p>
                  <p className="text-xs opacity-70">Avaliação</p>
                </div>
              </div>
            )}
          </DrawerHeader>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {menuItems.map((item, index) => (
                <button
                  key={`${item.path}-${index}`}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/10 active:bg-muted/20 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-muted" />
                  <span className="font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 active:bg-destructive/20 transition-colors text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair da Conta</span>
            </button>
            <p className="text-xs text-center text-muted">Gamma v1.0.0</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PilotDrawer;
