import { useEffect } from 'react';
import { isNativeMobile } from '@/capacitor';

// Dynamic import to avoid crashing the web build
async function getPushPlugin() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  } catch {
    return null;
  }
}

export function usePushNotifications(userId?: string) {
  useEffect(() => {
    if (!isNativeMobile || !userId) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const setup = async () => {
      const Push = await getPushPlugin();
      if (!Push) return;

      // Request OS-level permission
      const result = await Push.requestPermissions();
      if (result.receive !== 'granted') return;

      // Create notification channel for Android 13+
      if ((window as any).Capacitor?.getPlatform() === 'android') {
        await Push.createChannel({
          id: 'gamma_rides',
          name: 'Corridas',
          description: 'Notificações de corridas em tempo real',
          importance: 5, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#1B4FBF',
        });
      }

      // Register with APNs (iOS) or FCM (Android)
      await Push.register();

      // Persist the device token so the Edge Function can address this device
      const tokenListener = await Push.addListener('registration', async (token) => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { platform } = await import('@/capacitor');
          await supabase.from('push_tokens').upsert(
            {
              user_id: userId,
              token: token.value,
              platform,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform' }
          );
        } catch (e) {
          console.warn('[PushNotifications] Could not save token:', e);
        }
      });

      // Log foreground notifications (in-app UI handles the display)
      const receiveListener = await Push.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('[PushNotifications] Foreground notification received');
        }
      );

      // Handle tap on a background / killed-state notification
      const actionListener = await Push.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          const data = action.notification.data;
          if (data?.type === 'ride_accepted' && data?.rideId) {
            window.dispatchEvent(
              new CustomEvent('push:ride_accepted', { detail: { rideId: data.rideId } })
            );
          }
          if (data?.type === 'new_ride') {
            window.dispatchEvent(new CustomEvent('push:new_ride', { detail: data }));
          }
        }
      );

      return () => {
        tokenListener.remove();
        receiveListener.remove();
        actionListener.remove();
      };
    };

    setup().then((fn) => {
      if (cancelled) {
        fn?.();
      } else {
        cleanup = fn;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [userId]);
}
