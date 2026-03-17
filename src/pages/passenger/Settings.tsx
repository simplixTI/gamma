import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Globe, Shield, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import SimplixFooter from '@/components/SimplixFooter';
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
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, isLoaded } = useSettings();
  const { signOut } = useAuthContext();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Log audit trail for LGPD compliance before deletion
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('request_account_deletion', { p_user_id: user.id });
      }
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error || (data && !data.success)) {
        throw new Error(error?.message ?? data?.error ?? 'Erro ao deletar conta');
      }
      await signOut();
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = (
    key: 'notifications' | 'darkMode' | 'shareLocation',
    value: boolean,
    label: string
  ) => {
    updateSetting(key, value);
    toast.success(`${label} ${value ? 'ativado' : 'desativado'}`);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Notificações</p>
                <p className="text-sm text-muted">Alertas sobre suas viagens</p>
              </div>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => handleToggle('notifications', checked, 'Notificações')}
            />
          </div>
        </div>

        {/* Dark Mode */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Modo escuro</p>
                <p className="text-sm text-muted">Aparência do aplicativo</p>
              </div>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(checked) => handleToggle('darkMode', checked, 'Modo escuro')}
            />
          </div>
        </div>

        {/* Share Location */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Compartilhar localização</p>
                <p className="text-sm text-muted">Para melhorar a experiência</p>
              </div>
            </div>
            <Switch
              checked={settings.shareLocation}
              onCheckedChange={(checked) => handleToggle('shareLocation', checked, 'Compartilhamento de localização')}
            />
          </div>
        </div>

        {/* Language */}
        <button className="w-full bg-card rounded-xl border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-muted" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Idioma</p>
              <p className="text-sm text-muted">Português (Brasil)</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted" />
        </button>

        {/* About */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted text-center mb-2">Gamma v1.0.0</p>
          <p className="text-xs text-muted text-center">
            © {new Date().getFullYear()} Gamma. Todos os direitos reservados.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="pt-2 border-t border-destructive/30">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Deletar minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Todos os seus dados, histórico de viagens e carteira
                  serão permanentemente removidos conforme a LGPD.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deletando...' : 'Deletar conta'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <SimplixFooter />
    </div>
  );
};

export default Settings;
