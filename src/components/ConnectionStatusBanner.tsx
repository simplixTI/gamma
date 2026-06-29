import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { cn } from '@/lib/utils';

// Grace period antes de mostrar a tarja vermelha. WebSocket sempre cai quando
// o app vai pro background no Android (ex: abrir o app do banco para fazer PIX).
// A reconexao tipicamente acontece em <3s ao voltar. Sem grace period o passageiro
// ve uma tarja "Reconectando" assustadora e acha que o pedido caiu.
const DISCONNECT_GRACE_MS = 6000;

const ConnectionStatusBanner = () => {
  const { isOnline, isRealtimeConnected, isFullyConnected, reconnect } = useConnectionStatus();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (!isFullyConnected) {
      // Reconexao curta nao mostra nada. Se persistir alem do grace, mostra.
      const t = setTimeout(() => {
        setShowBanner(true);
        setWasDisconnected(true);
      }, DISCONNECT_GRACE_MS);
      return () => clearTimeout(t);
    } else if (wasDisconnected) {
      // "Conexao restabelecida" verde por 2s, so se a tarja vermelha chegou a aparecer
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
