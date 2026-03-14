import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { cn } from '@/lib/utils';

const ConnectionStatusBanner = () => {
  const { isOnline, isRealtimeConnected, isFullyConnected, reconnect } = useConnectionStatus();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // Show banner when disconnected, hide after reconnection with delay
  useEffect(() => {
    if (!isFullyConnected) {
      setShowBanner(true);
      setWasDisconnected(true);
    } else if (wasDisconnected) {
      // Show "reconnected" message briefly
      const timeout = setTimeout(() => {
        setShowBanner(false);
        setWasDisconnected(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isFullyConnected, wasDisconnected]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    await reconnect();
    setTimeout(() => setIsReconnecting(false), 2000);
  };

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 safe-area-top transition-all duration-300',
        isFullyConnected 
          ? 'bg-success text-success-foreground' 
          : 'bg-destructive text-destructive-foreground'
      )}
    >
      <div className="flex items-center justify-center gap-2 py-2 px-4">
        {isFullyConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Conexão restabelecida</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              {!isOnline 
                ? 'Sem conexão com a internet' 
                : 'Reconectando ao servidor...'}
            </span>
            {isOnline && (
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4', isReconnecting && 'animate-spin')} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatusBanner;
