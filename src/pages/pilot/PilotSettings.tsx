import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Navigation, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import SimplixFooter from '@/components/SimplixFooter';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

const PilotSettings = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, isLoaded } = useSettings();

  const handleToggle = (
    key: 'notifications' | 'soundAlerts' | 'autoNavigation' | 'darkMode',
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
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground px-4 py-4 safe-area-top">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Configurações</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Notificações push</p>
                <p className="text-sm text-muted">Novas corridas e alertas</p>
              </div>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => handleToggle('notifications', checked, 'Notificações')}
            />
          </div>
        </div>

        {/* Sound Alerts */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">Alertas sonoros</p>
                <p className="text-sm text-muted">Som ao receber corridas</p>
              </div>
            </div>
            <Switch
              checked={settings.soundAlerts}
              onCheckedChange={(checked) => handleToggle('soundAlerts', checked, 'Alertas sonoros')}
            />
          </div>
        </div>

        {/* Auto Navigation */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Navegação automática</p>
                <p className="text-sm text-muted">Abrir mapa ao aceitar corrida</p>
              </div>
            </div>
            <Switch
              checked={settings.autoNavigation}
              onCheckedChange={(checked) => handleToggle('autoNavigation', checked, 'Navegação automática')}
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

        {/* Change Password */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <ChangePasswordDialog />
        </div>

        {/* About */}
        <div className="pt-6 border-t border-border mt-6">
          <p className="text-sm text-muted text-center mb-2">Gamma Piloto v1.0.0</p>
          <p className="text-xs text-muted text-center">
            © {new Date().getFullYear()} Gamma. Todos os direitos reservados.
          </p>
        </div>
      </div>
      <SimplixFooter />
    </div>
  );
};

export default PilotSettings;
