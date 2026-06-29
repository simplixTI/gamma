import { useEffect, useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

// Rota /refresh — limpa Service Worker + CacheStorage, mantem login intacto.
// Use quando o PWA estiver servindo versao velha apos um deploy.
const Refresh = () => {
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const log = (msg: string) => {
      if (!cancelled) setSteps((prev) => [...prev, msg]);
    };

    const run = async () => {
      try {
        // 1. Desregistra TODOS os service workers do origin
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
          log(`Service workers desregistrados: ${regs.length}`);
        } else {
          log('Service Worker API nao disponivel (ignorado)');
        }

        // 2. Limpa CacheStorage (workbox / runtime caches)
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          log(`Caches removidos: ${keys.length}`);
        } else {
          log('CacheStorage nao disponivel (ignorado)');
        }

        // 3. NAO limpamos localStorage/sessionStorage — preserva sessao do Supabase
        log('localStorage preservado (login mantido)');

        log('Pronto. Redirecionando em 1.5s...');
        if (!cancelled) setStatus('done');

        // 4. Hard reload com cache-busting na home
        setTimeout(() => {
          if (cancelled) return;
          const bust = `?_=${Date.now()}`;
          window.location.replace(`/${bust}`);
        }, 1500);
      } catch (err) {
        console.error('[/refresh] failed:', err);
        log(`Erro: ${err instanceof Error ? err.message : String(err)}`);
        if (!cancelled) setStatus('error');
      }
    };

    void run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          {status === 'working' && (
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          )}
          {status === 'done' && (
            <Check className="w-6 h-6 text-success" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-6 h-6 text-destructive" />
          )}
          <h1 className="text-lg font-semibold text-foreground">
            {status === 'working' && 'Limpando cache...'}
            {status === 'done' && 'Cache limpo!'}
            {status === 'error' && 'Falha ao limpar'}
          </h1>
        </div>

        <ul className="space-y-1 text-xs text-muted-foreground font-mono">
          {steps.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>

        {status === 'error' && (
          <button
            onClick={() => window.location.replace('/')}
            className="w-full mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Voltar para o app
          </button>
        )}
      </div>
    </div>
  );
};

export default Refresh;
