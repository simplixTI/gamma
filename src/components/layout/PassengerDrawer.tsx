import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, History, CreditCard, Wallet, Star, Settings, HelpCircle, LogOut, X, Plus, Gift } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PassengerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuItems = [
  { icon: User, label: 'Meu Perfil', path: '/passenger/profile' },
  { icon: History, label: 'Histórico de Viagens', path: '/passenger/history' },
  { icon: Gift, label: 'Indicar Amigos', path: '/passenger/referral' },
  { icon: CreditCard, label: 'Pagamento', path: '/passenger/payment' },
  { icon: Star, label: 'Favoritos', path: '/passenger/favorites' },
  { icon: Settings, label: 'Configurações', path: '/passenger/settings' },
  { icon: HelpCircle, label: 'Ajuda e Suporte', path: '/passenger/help' },
];

const PassengerDrawer = ({ open, onOpenChange }: PassengerDrawerProps) => {
  const navigate = useNavigate();
  const { passengerProfile, user, signOut } = useAuthContext();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    supabase
      .from('passenger_profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setWalletBalance(Number(data.wallet_balance));
      });
  }, [open, user?.id]);

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
          {/* Header */}
          <DrawerHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {passengerProfile?.photo_url ? (
                    <img 
                      src={passengerProfile.photo_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <User className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div>
                  <DrawerTitle className="text-lg font-semibold">
                    {passengerProfile?.full_name?.split(' ')[0] || 'Passageiro'}
                  </DrawerTitle>
                  <p className="text-sm text-muted">Bem-vindo ao Gamma</p>
                </div>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {/* Wallet balance card */}
          <button
            onClick={() => handleNavigate('/passenger/wallet')}
            className="mx-4 mt-3 mb-1 bg-primary/10 rounded-xl p-3 flex items-center justify-between active:bg-primary/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <div className="text-left">
                <p className="text-xs text-muted">Gamma Cash</p>
                <p className="text-sm font-bold text-foreground">
                  {walletBalance !== null
                    ? `R$ ${walletBalance.toFixed(2).replace('.', ',')}`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">Adicionar</span>
            </div>
          </button>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
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

export default PassengerDrawer;
