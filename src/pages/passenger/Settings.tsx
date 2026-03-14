import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Globe, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import SimplixFooter from '@/components/SimplixFooter';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, isLoaded } = useSettings();

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
      </div>
          <SimplixFooter />
    </div>
  );
};

export default Settings;
