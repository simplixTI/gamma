import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import Logo from '@/components/Logo';

const sections = [
  {
    id: 'secao-1',
    title: '1. Aceitacao dos Termos',
    content: (
      <>
        <p>
          Ao baixar, instalar ou utilizar o aplicativo <strong>Gamma</strong>, voce declara ter
          lido, compreendido e concordado com estes Termos de Uso, bem como com nossa{' '}
          <Link to="/privacy" className="text-blue-400 underline">
            Politica de Privacidade
          </Link>
          .
        </p>
        <p>
          Se voce nao concordar com qualquer disposicao destes Termos, nao utilize o servico. O uso
          continuado do aplicativo apos alteracoes nos Termos implica aceitacao das novas versoes.
        </p>
        <p>
          Estes Termos constituem um contrato legalmente vinculante entre voce e a{' '}
          <strong>Simplix</strong> (CNPJ [CNPJ A PREENCHER]), desenvolvedora e operadora do Gamma.
        </p>
      </>
    ),
  },
  {
    id: 'secao-2',
    title: '2. Elegibilidade',
    content: (
      <>
        <p>Para utilizar o Gamma, voce deve:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            Ter <strong>18 anos ou mais</strong>. O servico nao e destinado a menores de 18 anos e
            nao coletamos dados de criancas.
          </li>
          <li>
            Possuir capacidade legal plena para celebrar contratos conforme o Codigo Civil
            brasileiro.
          </li>
          <li>Fornecer informacoes verdadeiras, completas e atualizadas no cadastro.</li>
        </ul>
        <p className="mt-2">
          <strong>Para pilotos parceiros, adicionalmente:</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>Possuir Habilitacao Nautica (arrais-amador ou superior) valida e regular.</li>
          <li>
            Manter a embarcacao com documentacao regular junto a Marinha do Brasil (DPC) e com
            seguro vigente.
          </li>
          <li>Cumprir todas as normas de segurança nautical aplicaveis.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-3',
    title: '3. Cadastro e Conta',
    content: (
      <>
        <p>
          Ao criar uma conta no Gamma, voce se compromete a fornecer informacoes veridicas e mante-las
          atualizadas. Voce e responsavel por:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>Manter a confidencialidade de suas credenciais de acesso.</li>
          <li>
            Notificar imediatamente a Simplix, pelo e-mail{' '}
            <a href="mailto:contato@gamma.app.br" className="text-blue-400 underline">
              contato@gamma.app.br
            </a>
            , sobre qualquer acesso nao autorizado a sua conta.
          </li>
          <li>Nao compartilhar sua conta com terceiros.</li>
          <li>Todas as atividades realizadas com suas credenciais.</li>
        </ul>
        <p className="mt-2">
          A Simplix pode recusar ou cancelar cadastros a seu criterio, especialmente em casos de
          suspeita de fraude ou violacao destes Termos.
        </p>
      </>
    ),
  },
  {
    id: 'secao-4',
    title: '4. Uso do Servico — Passageiro',
    content: (
      <>
        <p>Como passageiro, voce pode:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>Solicitar corridas na Ilha da Gigoia, Barra da Tijuca, e regioes cobertas pelo Gamma.</li>
          <li>Visualizar a posicao da embarcacao em tempo real.</li>
          <li>Pagar via PIX ou cartao de credito pelo aplicativo.</li>
          <li>Avaliar pilotos apos cada corrida.</li>
        </ul>
        <p className="mt-3">Voce se compromete a:</p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>Estar no ponto de embarque no horario combinado.</li>
          <li>Tratar pilotos e outros passageiros com respeito e civilidade.</li>
          <li>Nao transportar materiais proibidos por lei ou perigosos a embarcacao.</li>
          <li>Cumprir as instrucoes de segurança do piloto.</li>
          <li>Usar coletes salva-vidas quando disponibilizados e exigidos.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-5',
    title: '5. Uso do Servico — Piloto Parceiro',
    content: (
      <>
        <p>
          Pilotos parceiros atuam como prestadores de servico autonomos. A relacao entre pilotos e
          a Simplix <strong>nao configura vinculo empregaticio</strong>.
        </p>
        <p className="mt-2">O piloto e responsavel por:</p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>Manter habilitacao nautica e documentacao da embarcacao em dia.</li>
          <li>Garantir as condicoes de segurança da embarcacao antes de cada corrida.</li>
          <li>Disponibilizar coletes salva-vidas para todos os passageiros.</li>
          <li>Respeitar limites de velocidade e normas de navegacao.</li>
          <li>Nao operar sob efeito de alcool, drogas ou em condicoes climaticas adversas.</li>
          <li>Tratar passageiros com cortesia e profissionalismo.</li>
          <li>Manter o aplicativo atualizado e a disponibilidade informada corretamente.</li>
        </ul>
        <p className="mt-2">
          Pilotos que descumprirem estas obrigacoes poderao ter sua conta suspensa ou encerrada,
          sem prejuizo de eventuais responsabilidades civis e penais.
        </p>
      </>
    ),
  },
  {
    id: 'secao-6',
    title: '6. Pagamentos e Tarifas',
    content: (
      <>
        <p>
          Os pagamentos sao processados pela plataforma <strong>Mercado Pago</strong>, por meio de
          PIX ou cartao de credito. Ao realizar um pagamento, voce concorda com os termos de uso do
          Mercado Pago aplicaveis.
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            Os valores das corridas sao calculados com base na rota, demanda e tarifas vigentes,
            exibidas antes da confirmacao.
          </li>
          <li>A tarifa confirmada pelo usuario e o valor final cobrado.</li>
          <li>
            A Simplix retém uma comissão de servico sobre cada corrida concluida, conforme
            comunicado ao piloto no momento do cadastro.
          </li>
          <li>
            Repasses aos pilotos sao realizados conforme calendario e condicoes informadas na area
            do piloto no aplicativo.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-7',
    title: '7. Cancelamentos e Reembolsos',
    content: (
      <>
        <p>
          <strong>Cancelamento pelo passageiro:</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>
            Cancelamentos realizados com mais de <strong>5 minutos</strong> de antecedencia do
            embarque: sem cobranca.
          </li>
          <li>
            Cancelamentos com menos de 5 minutos ou apos o inicio da corrida: pode ser aplicada
            taxa de cancelamento.
          </li>
        </ul>
        <p className="mt-3">
          <strong>Cancelamento pelo piloto:</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>Nenhuma cobranca ao passageiro. Nova corrida sera oferecida automaticamente.</li>
        </ul>
        <p className="mt-3">
          <strong>Reembolsos:</strong> solicitacoes de reembolso por falha tecnica ou cobranca
          indevida devem ser feitas em ate <strong>7 dias corridos</strong> via e-mail{' '}
          <a href="mailto:contato@gamma.app.br" className="text-blue-400 underline">
            contato@gamma.app.br
          </a>
          . Reembolsos aprovados sao processados em ate 10 dias uteis, dependendo do metodo de
          pagamento utilizado.
        </p>
      </>
    ),
  },
  {
    id: 'secao-8',
    title: '8. Avaliacoes e Conduta',
    content: (
      <>
        <p>
          O sistema de avaliacoes mutuas (passageiro avalia piloto e vice-versa) e fundamental para
          a qualidade do servico. Ao avaliar, voce se compromete a:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>Ser honesto e baseado na experiencia real da corrida.</li>
          <li>Nao usar avaliacoes para assedio, discriminacao ou vinganca.</li>
        </ul>
        <p className="mt-3">
          <strong>Condutas que resultam em suspensao ou exclusao imediata:</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>Assedio, ameacas ou discriminacao a outros usuarios ou pilotos.</li>
          <li>Fraude no sistema de pagamentos.</li>
          <li>Uso do servico para atividades ilegais.</li>
          <li>Criacao de contas falsas ou multiplas contas para manipular o sistema.</li>
          <li>Danos a embarcacoes de pilotos parceiros.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-9',
    title: '9. Propriedade Intelectual',
    content: (
      <>
        <p>
          Todo o conteudo do aplicativo Gamma — incluindo marca, logotipo, textos, codigo-fonte,
          interface, design e funcionalidades — e propriedade da Simplix ou de seus licenciantes, e
          esta protegido pela legislacao brasileira de propriedade intelectual.
        </p>
        <p className="mt-2">
          E vedado ao usuario reproduzir, copiar, modificar, distribuir, vender ou criar obras
          derivadas com base em qualquer parte do aplicativo sem autorizacao previa e por escrito da
          Simplix.
        </p>
        <p className="mt-2">
          A licenca concedida ao usuario e limitada, pessoal, nao exclusiva, nao transferivel e
          revogavel, para uso do aplicativo conforme estes Termos (EULA — End User License
          Agreement).
        </p>
      </>
    ),
  },
  {
    id: 'secao-10',
    title: '10. Limitacao de Responsabilidade',
    content: (
      <>
        <p>
          O Gamma atua como <strong>plataforma de intermediacao</strong> entre passageiros e pilotos
          autonomos. A Simplix <strong>nao e transportadora</strong> e nao executa diretamente o
          servico de transporte aquatico.
        </p>
        <p className="mt-2">A Simplix nao se responsabiliza por:</p>
        <ul className="list-disc list-inside space-y-2 mt-1">
          <li>Atrasos, cancelamentos ou indisponibilidade de pilotos.</li>
          <li>Danos fisicos, materiais ou morais decorrentes da conducao das embarcacoes.</li>
          <li>Condicoes climaticas ou maritimas adversas que impossibilitem o servico.</li>
          <li>Falhas de conectividade de internet do usuario.</li>
          <li>Perdas e danos indiretos, incidentais ou consequenciais.</li>
        </ul>
        <p className="mt-2">
          A responsabilidade maxima da Simplix, em qualquer hipotese, fica limitada ao valor pago
          pelo usuario na corrida objeto da reclamacao.
        </p>
        <p className="mt-2">
          O usuario utiliza o servico ciente dos riscos inerentes ao transporte aquatico e e sua
          responsabilidade verificar condicoes de segurança antes do embarque.
        </p>
      </>
    ),
  },
  {
    id: 'secao-11',
    title: '11. Suspensao e Exclusao de Conta',
    content: (
      <>
        <p>
          A Simplix pode suspender ou encerrar sua conta, com ou sem aviso previo, nas seguintes
          situacoes:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>Violacao destes Termos de Uso.</li>
          <li>Suspeita de fraude, uso indevido ou atividade ilegal.</li>
          <li>Avaliacao consistentemente baixa que indique conduta inadequada.</li>
          <li>Inatividade prolongada (mais de 24 meses).</li>
          <li>Solicitacao do proprio usuario.</li>
        </ul>
        <p className="mt-2">
          Voce pode solicitar a exclusao de sua conta a qualquer momento pelo e-mail{' '}
          <a href="mailto:contato@gamma.app.br" className="text-blue-400 underline">
            contato@gamma.app.br
          </a>{' '}
          com o assunto "Exclusao de Conta". Dados serao tratados conforme a Politica de
          Privacidade.
        </p>
      </>
    ),
  },
  {
    id: 'secao-12',
    title: '12. Legislacao Aplicavel e Foro',
    content: (
      <p>
        Estes Termos sao regidos pelas leis da <strong>Republica Federativa do Brasil</strong>.
        Fica eleito o foro da comarca do <strong>Rio de Janeiro — RJ</strong> para dirimir quaisquer
        controversias oriundas destes Termos, com renûncia expressa a qualquer outro, por mais
        privilegiado que seja. O Codigo de Defesa do Consumidor (Lei 8.078/1990) e a LGPD (Lei
        13.709/2018) aplicam-se na integra onde couberem.
      </p>
    ),
  },
  {
    id: 'secao-13',
    title: '13. Contato',
    content: (
      <>
        <p>Para duvidas, suporte ou exercicio de direitos, entre em contato:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>Suporte geral:</strong>{' '}
            <a href="mailto:contato@gamma.app.br" className="text-blue-400 underline">
              contato@gamma.app.br
            </a>
          </li>
          <li>
            <strong>Privacidade e dados pessoais (DPO):</strong>{' '}
            <a href="mailto:privacidade@gamma.app.br" className="text-blue-400 underline">
              privacidade@gamma.app.br
            </a>
          </li>
          <li>
            <strong>Empresa:</strong> Simplix — CNPJ [CNPJ A PREENCHER]
          </li>
        </ul>
      </>
    ),
  },
];

const TermsOfUse = () => {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-primary text-primary-foreground font-[Inter,sans-serif]">
      {/* Header */}
      <header className="sticky top-0 bg-primary/95 backdrop-blur-sm z-10 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center gap-4 px-5 py-4">
          <Link
            to="/"
            aria-label="Voltar ao inicio"
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size="md" variant="white" />
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-blue-400 shrink-0" />
          <h1 className="text-2xl font-bold tracking-tight">Termos de Uso</h1>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Atualizado em marco de 2025 &mdash; vigente a partir de 01 de abril de 2025
        </p>
        <p className="mt-4 text-sm text-primary-foreground/80 leading-relaxed">
          Leia atentamente estes Termos antes de utilizar o Gamma. Ao usar o aplicativo, voce
          concorda com as regras descritas abaixo, que regulam a relacao entre voce e a Simplix,
          desenvolvedora do Gamma.
        </p>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-5 pb-16 space-y-4">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-xl border border-border/50 p-6 space-y-3"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.04)' }}
          >
            <h2 className="text-base font-bold text-foreground leading-snug">{section.title}</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              {section.content}
            </div>
          </section>
        ))}

        {/* Footer links */}
        <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-primary-foreground/50">
          <span>Gamma &copy; {new Date().getFullYear()} Simplix</span>
          <div className="flex gap-4">
            <Link
              to="/privacy"
              className="hover:text-primary-foreground transition-colors underline underline-offset-2"
            >
              Politica de Privacidade
            </Link>
            <Link
              to="/"
              className="hover:text-primary-foreground transition-colors underline underline-offset-2"
            >
              Voltar ao inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
