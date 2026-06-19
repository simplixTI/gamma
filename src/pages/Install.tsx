import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Apple, Share, Plus, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/mac|win|linux/.test(ua)) return 'desktop';
  return 'unknown';
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS-specific check
    // @ts-expect-error — Safari only property
    window.navigator.standalone === true
  );
};

const InstallPage = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Gamma já instalado!</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Você já está com o app instalado no seu dispositivo.
        </p>
        <Button onClick={() => navigate('/')}>Abrir Gamma</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 safe-area-top">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">Instalar app</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo className="w-20 h-20 mb-3" />
          <h2 className="text-2xl font-bold text-foreground">Gamma na tela inicial</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Instale o app para acesso rápido, sem barra de navegador e com cara de aplicativo nativo.
          </p>
        </div>

        {/* Native install (Android Chrome / Desktop Chrome) */}
        {deferredPrompt && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Instalação rápida</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Seu navegador suporta instalação automática.</p>
              </div>
            </div>
            <Button onClick={handleInstall} fullWidth size="lg" className="h-12 rounded-xl">
              Instalar Gamma
            </Button>
          </div>
        )}

        {/* iOS instructions */}
        {(platform === 'ios' || platform === 'unknown') && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                <Apple className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-bold text-foreground">iPhone / iPad</h3>
            </div>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-sm text-foreground">
                  Abra esta página no <strong>Safari</strong> (não funciona pelo Chrome iOS).
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-sm text-foreground">
                  Toque no ícone <Share className="w-3.5 h-3.5 inline mb-0.5" /> <strong>Compartilhar</strong> na barra inferior.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-sm text-foreground">
                  Role e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p className="text-sm text-foreground">
                  Confirme em <strong>"Adicionar"</strong>. O ícone do Gamma aparecerá ao lado dos outros apps.
                </p>
              </li>
            </ol>
          </section>
        )}

        {/* Android instructions */}
        {(platform === 'android' || platform === 'unknown') && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-bold text-foreground">Android</h3>
            </div>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-sm text-foreground">
                  Abra esta página pelo <strong>Chrome</strong> ou <strong>Edge</strong>.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-sm text-foreground">
                  Aguarde o banner <strong>"Instalar Gamma"</strong> aparecer — ou toque no menu <strong>⋮</strong> no canto superior direito.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-sm text-foreground">
                  Selecione <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p className="text-sm text-foreground">
                  Confirme. O Gamma aparecerá na gaveta de apps com ícone próprio.
                </p>
              </li>
            </ol>
          </section>
        )}

        {/* Desktop instructions */}
        {platform === 'desktop' && !deferredPrompt && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                <Plus className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-bold text-foreground">Desktop (Chrome / Edge)</h3>
            </div>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-sm text-foreground">
                  Clique no ícone de <strong>instalar</strong> que aparece à direita da barra de endereço.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-sm text-foreground">
                  Ou abra o menu <strong>⋮</strong> → <strong>"Instalar Gamma"</strong>.
                </p>
              </li>
            </ol>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Algum problema?{' '}
          <button onClick={() => navigate('/passenger/help')} className="text-primary underline">
            Fale com a gente
          </button>
        </p>
      </div>
    </div>
  );
};

export default InstallPage;
