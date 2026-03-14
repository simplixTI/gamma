import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Termos de Uso</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 pb-12">
        <p className="text-xs text-muted-foreground">Última atualização: março de 2026</p>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">1. Aceitação dos Termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ao utilizar o aplicativo Gamma, você concorda com estes Termos de Uso. Se não concordar com algum item, não utilize o serviço.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">2. Descrição do Serviço</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Gamma é uma plataforma de transporte aquático que conecta passageiros a pilotos de embarcações na Ilha de Gigoia e arredores. Atuamos como intermediários e não somos responsáveis diretamente pela execução do transporte.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">3. Cadastro e Conta</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para usar o serviço, você deve criar uma conta com informações verídicas. É sua responsabilidade manter a segurança de sua senha e notificar imediatamente qualquer acesso não autorizado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">4. Uso Adequado</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Você se compromete a utilizar o aplicativo de forma legal e respeitosa. É proibido:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Fornecer informações falsas no cadastro</li>
            <li>Usar o serviço para atividades ilícitas</li>
            <li>Assediar ou ameaçar outros usuários ou pilotos</li>
            <li>Tentar fraudar o sistema de pagamentos</li>
            <li>Compartilhar sua conta com terceiros</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">5. Pagamentos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Os pagamentos são processados via PIX. Os valores são calculados com base na distância entre os pontos de embarque e desembarque. Cancelamentos podem sujeitar o usuário a taxas conforme a política vigente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">6. Programa de Indicação</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O programa de indicação concede descontos conforme regras específicas. A Simplix se reserva o direito de modificar ou encerrar o programa a qualquer momento, sem aviso prévio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">7. Limitação de Responsabilidade</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A Simplix não se responsabiliza por danos decorrentes do uso do aplicativo, falhas de conectividade, atrasos ou condutas de pilotos. O usuário utiliza o serviço por sua própria conta e risco.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">8. Alterações nos Termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Podemos atualizar estes termos periodicamente. O uso continuado do aplicativo após notificação constitui aceitação das mudanças.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">9. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dúvidas? Entre em contato pelo e-mail: <span className="text-primary">suporte@simplix.com.br</span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfUse;
