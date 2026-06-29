import type { CapacitorConfig } from '@capacitor/cli';

// Production config: WebView carrega a versao hospedada em https://gamma.app.br.
// Updates do site refletem automaticamente no app — so e necessario publicar uma
// nova versao na Play Store quando ha mudancas nativas (plugins, permissoes, etc).
const config: CapacitorConfig = {
  appId: 'com.gamma.boattaxi',
  appName: 'Gamma',
  // webDir continua apontando para o build local — usado como fallback quando
  // o app eh aberto sem internet no primeiro launch ou em ambientes de teste
  // (ex: `npx cap run` sem server.url ativo). Em producao server.url tem precedencia.
  webDir: 'dist',
  server: {
    url: 'https://gamma.app.br',
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'gamma.app.br',
      '*.supabase.co',
      '*.googleapis.com',
      'accounts.google.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
