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
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {
    // Ignore
  }
}
