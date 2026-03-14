import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPermissionBannerProps {
  onClose?: () => void;
}

const NotificationPermissionBanner = ({ onClose }: NotificationPermissionBannerProps) => {
  const { permission, isSupported, requestPermission } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not supported, already granted, or dismissed
  if (!isSupported || permission === 'granted' || dismissed) {
    return null;
  }

  // Don't show if permanently denied
  if (permission === 'denied') {
    return null;
  }

  const handleAllow = async () => {
    setIsLoading(true);
    await requestPermission();
    setIsLoading(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  return (
    <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3 animate-slide-up">
      <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center shrink-0">
        <Bell className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Ativar notificações</p>
        <p className="text-xs opacity-80">Receba alertas quando seu barco chegar</p>
      </div>
      
      <Button
        size="sm"
        variant="secondary"
        onClick={handleAllow}
        disabled={isLoading}
        className="shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
      >
        {isLoading ? 'Ativando...' : 'Ativar'}
      </Button>
      
      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-primary-foreground/10 rounded-full transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationPermissionBanner;