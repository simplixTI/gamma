import { useState, useEffect, useCallback } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') {
        console.log('Notifications not available or not permitted');
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: true,
          ...options,
        });

        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        return null;
      }
    },
    [isSupported, permission]
  );

  // Ride-specific notification helpers
  const notifyRideAccepted = useCallback(
    (pilotName: string) => {
      return showNotification('Corrida aceita!', {
        body: `${pilotName} aceitou sua corrida e está a caminho.`,
        tag: 'ride-accepted',
      });
    },
    [showNotification]
  );

  const notifyPilotArrived = useCallback(
    (pilotName: string, location: string) => {
      return showNotification('Piloto chegou!', {
        body: `${pilotName} está esperando você em ${location}.`,
        tag: 'pilot-arrived',
      });
    },
    [showNotification]
  );

  const notifyRideStarted = useCallback(() => {
    return showNotification('Viagem iniciada!', {
      body: 'Sua viagem começou. Boa travessia!',
      tag: 'ride-started',
    });
  }, [showNotification]);

  const notifyRideCompleted = useCallback(
    (price: number) => {
      return showNotification('Viagem concluída!', {
        body: `Você chegou ao destino. Valor: R$${price.toFixed(0)}`,
        tag: 'ride-completed',
      });
    },
    [showNotification]
  );

  // Pilot notifications
  const notifyNewRideRequest = useCallback(
    (passengerName: string, origin: string, price: number) => {
      return showNotification('Nova corrida!', {
        body: `${passengerName} em ${origin} - R$${price.toFixed(0)}`,
        tag: 'new-ride',
      });
    },
    [showNotification]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    notifyRideAccepted,
    notifyPilotArrived,
    notifyRideStarted,
    notifyRideCompleted,
    notifyNewRideRequest,
  };
};