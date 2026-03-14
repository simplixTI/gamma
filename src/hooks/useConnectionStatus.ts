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

  // Auto-reconnect when coming back online
  const reconnect = useCallback(async () => {
    if (status.isOnline && !status.isRealtimeConnected) {
      // Force reconnection by removing and re-adding channels
      const channels = supabase.getChannels();
      for (const channel of channels) {
        await supabase.removeChannel(channel);
      }
    }
  }, [status.isOnline, status.isRealtimeConnected]);

  // Attempt reconnection when network comes back
  useEffect(() => {
    if (status.isOnline && !status.isRealtimeConnected) {
      const timeout = setTimeout(reconnect, 1000);
      return () => clearTimeout(timeout);
    }
  }, [status.isOnline, status.isRealtimeConnected, reconnect]);

  return {
    ...status,
    isFullyConnected: status.isOnline && status.isRealtimeConnected,
    reconnect,
  };
};
