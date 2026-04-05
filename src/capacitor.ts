import { Capacitor } from '@capacitor/core';

export const isNativeMobile = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Initialize Capacitor plugins for native mobile.
 * Called once on app startup. Safe to call on web (no-ops gracefully).
 */
export async function initMobilePlugins() {
  if (!isNativeMobile) return;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Plugin may not be available in all environments
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    }
  } catch {
    // Ignore
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    // Remove any previous listeners before adding new ones to avoid duplicates
    // if initMobilePlugins is ever called more than once.
    await Keyboard.removeAllListeners();
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {
    // Ignore
  }

  try {
    // Re-connect Supabase Realtime when the app returns to foreground.
    // Android / iOS kill WebSocket connections when the app is backgrounded;
    // without this handler, passengers/pilots lose live updates until they
    // hard-reload the app.
    const { App: CapApp } = await import('@capacitor/app');
    CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) return;
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        // Reconnect all channels that were open before backgrounding.
        // supabase-js exposes this via the internal realtime client.
        await supabase.realtime.connect();
      } catch (err) {
        console.warn('[Capacitor] Supabase realtime reconnect failed:', err);
      }
    });

    // Handle OAuth deep links (Google sign-in callback on native)
    // When Supabase redirects back to gamma.app.br/auth/callback, Capacitor
    // intercepts the URL here. We pass the full URL to the WebView so
    // supabase-js can parse the access_token/code from the hash/query params.
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (url.includes('access_token') || url.includes('code=') || url.includes('/auth/callback')) {
        // Validate URL origin to prevent malicious deep links
        try {
          const urlObj = new URL(url);
          const allowedOrigin = import.meta.env.VITE_APP_URL || 'https://gamma.app.br';
          const allowedOriginObj = new URL(allowedOrigin);

          if (urlObj.origin === allowedOriginObj.origin) {
            window.location.href = url;
          } else {
            console.warn('[Capacitor] Rejected deep link from untrusted origin:', urlObj.origin);
          }
        } catch (err) {
          console.warn('[Capacitor] Invalid deep link URL:', err);
        }
      }
    });
  } catch {
    // @capacitor/app may not be installed
  }
}
