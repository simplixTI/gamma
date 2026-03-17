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

  return {
    ...status,
    isFullyConnected: status.isOnline && status.isRealtimeConnected,
    reconnect,
  };
};
