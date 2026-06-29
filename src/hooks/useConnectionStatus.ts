import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isOnline: boolean;
  isRealtimeConnected: boolean;
  lastDisconnectedAt: Date | null;
}

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isRealtimeConnected: true,
    lastDisconnectedAt: null,
  });

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastDisconnectedAt: new Date(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Supabase Realtime connection
  useEffect(() => {
    const channel = supabase
      .channel('connection-monitor')
      .subscribe((status) => {
        const isConnected = status === 'SUBSCRIBED';
        setStatus(prev => ({
          ...prev,
          isRealtimeConnected: isConnected,
          lastDisconnectedAt: isConnected ? null : new Date(),
        }));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-reconnect when coming back online — reconnect the WebSocket transport
  // WITHOUT removing existing channels (which would kill active ride subscriptions).
  const reconnect = useCallback(() => {
    if (status.isOnline && !status.isRealtimeConnected) {
      supabase.realtime.connect();
    }
  }, [status.isOnline, status.isRealtimeConnected]);

  // Attempt reconnection when network comes back
  useEffect(() => {
    if (status.isOnline && !status.isRealtimeConnected) {
      const timeout = setTimeout(reconnect, 1000);
      return () => clearTimeout(timeout);
    }
  }, [status.isOnline, status.isRealtimeConnected, reconnect]);

  // Reconexao proativa quando o app volta do background:
  // - document.visibilitychange (PWA/web)
  // - window.pageshow (iOS Safari bfcache restore)
  // - CustomEvent 'app-resume' (Capacitor nativo, ver src/capacitor.ts)
  // WebSocket sempre cai em background no Android — reconectar imediato
  // evita que o passageiro fique 30s sem updates ao voltar do app do banco.
  useEffect(() => {
    const handleResume = () => {
      if (!navigator.onLine) return;
      // Otimismo: assume conectado durante reconnect — evita flash do banner
      setStatus(prev => ({ ...prev, isRealtimeConnected: true }));
      try { supabase.realtime.connect(); } catch { /* ignore */ }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleResume();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('app-resume', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('app-resume', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, []);

  return {
    ...status,
    isFullyConnected: status.isOnline && status.isRealtimeConnected,
    reconnect,
  };
};
