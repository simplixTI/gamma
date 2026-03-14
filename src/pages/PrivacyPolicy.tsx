import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Política de Privacidade</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 pb-12">
        <p className="text-xs text-muted-foreground">Última atualização: março de 2026</p>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">1. Quais dados coletamos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Coletamos os seguintes dados ao usar o Gamma:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Nome completo, e-mail e telefone (cadastro)</li>
            <li>CPF (identificação e segurança)</li>
            <li>Foto de perfil (opcional)</li>
            <li>Localização geográfica (durante corridas ativas)</li>
            <li>Histórico de corridas e pagamentos</li>
            <li>Dados do dispositivo (ID anônimo para notificações)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">2. Como usamos seus dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seus dados são utilizados exclusivamente para:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Operar e melhorar o serviço de transporte aquático</li>
            <li>Processar pagamentos com segurança</li>
            <li>Enviar notificações sobre sua corrida</li>
            <li>Calcular descontos do programa de indicação</li>
            <li>Cumprir obrigações legais</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">3. Compartilhamento de dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Não vendemos seus dados. Compartilhamos informações apenas com pilotos parceiros (nome e telefone, durante corridas ativas) e com provedores de infraestrutura (Supabase, Google Maps) sob acordos de confidencialidade.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">4. Localização</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sua localização é acessada apenas durante corridas ativas e com sua permissão explícita. Não rastreamos sua localização em segundo plano quando não há corrida em andamento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">5. Armazenamento e segurança</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso. Utilizamos Row Level Security (RLS) para garantir que cada usuário acesse apenas seus próprios dados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">6. Seus direitos (LGPD)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Acessar e corrigir seus dados a qualquer momento</li>
            <li>Solicitar a exclusão da sua conta e dados</li>
            <li>Revogar consentimentos anteriores</li>
            <li>Receber seus dados em formato portável</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">7. Cookies e identificadores</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Utilizamos identificadores locais (localStorage) para manter sua sessão ativa e melhorar a experiência. Não utilizamos cookies de rastreamento de terceiros.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">8. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato: <span className="text-primary">privacidade@simplix.com.br</span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
