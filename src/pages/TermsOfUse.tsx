import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const sections = [
  {
    id: 'secao-1',
    num: '01',
    label: 'Aceitacao',
    title: 'Aceitacao dos Termos',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Ao baixar, instalar ou utilizar o aplicativo <strong className="text-white">Gamma</strong>, voce declara ter
          lido, compreendido e concordado com estes Termos de Uso, bem como com nossa{' '}
          <Link to="/privacy" style={{ color: '#22d3ee' }} className="hover:underline transition-colors">
            Politica de Privacidade
          </Link>
          .
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Se voce nao concordar com qualquer disposicao destes Termos, nao utilize o servico. O uso
          continuado do aplicativo apos alteracoes nos Termos implica aceitacao das novas versoes.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Estes Termos constituem um contrato legalmente vinculante entre voce e a{' '}
          <strong className="text-white">Simplix</strong> (CNPJ 54.062.495/0001-02), desenvolvedora e operadora do Gamma.
        </p>
      </div>
    ),
  },
  {
    id: 'secao-2',
    num: '02',
    label: 'Elegibilidade',
    title: 'Elegibilidade',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Para utilizar o Gamma, voce deve:
        </p>
        <ul className="space-y-2">
          {[
            <>Ter <strong className="text-white">18 anos ou mais</strong>. O servico nao e destinado a menores de 18 anos e nao coletamos dados de criancas.</>,
            <>Possuir capacidade legal plena para celebrar contratos conforme o Codigo Civil brasileiro.</>,
            <>Fornecer informacoes verdadeiras, completas e atualizadas no cadastro.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <strong className="text-white">Para pilotos parceiros, adicionalmente:</strong>
        </p>
        <ul className="space-y-2">
          {[
            <>Possuir Habilitacao Nautica (arrais-amador ou superior) valida e regular.</>,
            <>Manter a embarcacao com documentacao regular junto a Marinha do Brasil (DPC) e com seguro vigente.</>,
            <>Cumprir todas as normas de segurança nautica aplicaveis.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'secao-3',
    num: '03',
    label: 'Cadastro',
    title: 'Cadastro e Conta',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Ao criar uma conta no Gamma, voce se compromete a fornecer informacoes veridicas e mante-las
          atualizadas. Voce e responsavel por:
        </p>
        <ul className="space-y-2">
          {[
            <>Manter a confidencialidade de suas credenciais de acesso.</>,
            <>Notificar imediatamente a Simplix, pelo e-mail{' '}
              <a href="mailto:contato@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline transition-colors">
                contato@gamma.app.br
              </a>
              , sobre qualquer acesso nao autorizado a sua conta.</>,
            <>Nao compartilhar sua conta com terceiros.</>,
            <>Todas as atividades realizadas com suas credenciais.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          A Simplix pode recusar ou cancelar cadastros a seu criterio, especialmente em casos de
          suspeita de fraude ou violacao destes Termos.
        </p>
      </div>
    ),
  },
  {
    id: 'secao-4',
    num: '04',
    label: 'Passageiro',
    title: 'Uso do Servico — Passageiro',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>Como passageiro, voce pode:</p>
        <ul className="space-y-2">
          {[
            <>Solicitar corridas na Ilha da Gigoia, Barra da Tijuca, e regioes cobertas pelo Gamma.</>,
            <>Visualizar a posicao da embarcacao em tempo real.</>,
            <>Pagar via PIX ou cartao de credito pelo aplicativo.</>,
            <>Avaliar pilotos apos cada corrida.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>Voce se compromete a:</p>
        <ul className="space-y-2">
          {[
            <>Estar no ponto de embarque no horario combinado.</>,
            <>Tratar pilotos e outros passageiros com respeito e civilidade.</>,
            <>Nao transportar materiais proibidos por lei ou perigosos a embarcacao.</>,
            <>Cumprir as instrucoes de segurança do piloto.</>,
            <>Usar coletes salva-vidas quando disponibilizados e exigidos.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'secao-5',
    num: '05',
    label: 'Piloto',
    title: 'Uso do Servico — Piloto Parceiro',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Pilotos parceiros atuam como prestadores de servico autonomos. A relacao entre pilotos e
          a Simplix <strong className="text-white">nao configura vinculo empregaticio</strong>.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>O piloto e responsavel por:</p>
        <ul className="space-y-2">
          {[
            <>Manter habilitacao nautica e documentacao da embarcacao em dia.</>,
            <>Garantir as condicoes de segurança da embarcacao antes de cada corrida.</>,
            <>Disponibilizar coletes salva-vidas para todos os passageiros.</>,
            <>Respeitar limites de velocidade e normas de navegacao.</>,
            <>Nao operar sob efeito de alcool, drogas ou em condicoes climaticas adversas.</>,
            <>Tratar passageiros com cortesia e profissionalismo.</>,
            <>Manter o aplicativo atualizado e a disponibilidade informada corretamente.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Pilotos que descumprirem estas obrigacoes poderao ter sua conta suspensa ou encerrada,
            sem prejuizo de eventuais responsabilidades civis e penais.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'secao-6',
    num: '06',
    label: 'Pagamentos',
    title: 'Pagamentos e Tarifas',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Os pagamentos sao processados pela plataforma <strong className="text-white">Mercado Pago</strong>, por meio de
          PIX ou cartao de credito. Ao realizar um pagamento, voce concorda com os termos de uso do
          Mercado Pago aplicaveis.
        </p>
        <ul className="space-y-2">
          {[
            <>Os valores das corridas sao calculados com base na rota, demanda e tarifas vigentes, exibidas antes da confirmacao.</>,
            <>A tarifa confirmada pelo usuario e o valor final cobrado.</>,
            <>A Simplix retém uma comissão de servico sobre cada corrida concluida, conforme comunicado ao piloto no momento do cadastro.</>,
            <>Repasses aos pilotos sao realizados conforme calendario e condicoes informadas na area do piloto no aplicativo.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'secao-7',
    num: '07',
    label: 'Cancelamentos',
    title: 'Cancelamentos e Reembolsos',
    content: (
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-white mb-2">Cancelamento pelo passageiro</p>
          <ul className="space-y-2">
            {[
              <>Cancelamentos com mais de <strong className="text-white">5 minutos</strong> de antecedencia do embarque: sem cobranca.</>,
              <>Cancelamentos com menos de 5 minutos ou apos o inicio da corrida: pode ser aplicada taxa de cancelamento.</>,
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-white mb-2">Cancelamento pelo piloto</p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Nenhuma cobranca ao passageiro. Nova corrida sera oferecida automaticamente.
          </p>
        </div>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <strong className="text-white">Reembolsos:</strong> solicitacoes de reembolso por falha tecnica ou cobranca
          indevida devem ser feitas em ate <strong className="text-white">7 dias corridos</strong> via e-mail{' '}
          <a href="mailto:contato@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline transition-colors">
            contato@gamma.app.br
          </a>
          . Reembolsos aprovados sao processados em ate 10 dias uteis, dependendo do metodo de pagamento utilizado.
        </p>
      </div>
    ),
  },
  {
    id: 'secao-8',
    num: '08',
    label: 'Conduta',
    title: 'Avaliacoes e Conduta',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          O sistema de avaliacoes mutuas (passageiro avalia piloto e vice-versa) e fundamental para
          a qualidade do servico. Ao avaliar, voce se compromete a:
        </p>
        <ul className="space-y-2">
          {[
            <>Ser honesto e baseado na experiencia real da corrida.</>,
            <>Nao usar avaliacoes para assedio, discriminacao ou vinganca.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-white mb-3">Condutas que resultam em suspensao ou exclusao imediata</p>
          <ul className="space-y-2">
            {[
              <>Assedio, ameacas ou discriminacao a outros usuarios ou pilotos.</>,
              <>Fraude no sistema de pagamentos.</>,
              <>Uso do servico para atividades ilegais.</>,
              <>Criacao de contas falsas ou multiplas contas para manipular o sistema.</>,
              <>Danos a embarcacoes de pilotos parceiros.</>,
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'secao-9',
    num: '09',
    label: 'Propriedade',
    title: 'Propriedade Intelectual',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Todo o conteudo do aplicativo Gamma — incluindo marca, logotipo, textos, codigo-fonte,
          interface, design e funcionalidades — e propriedade da Simplix ou de seus licenciantes, e
          esta protegido pela legislacao brasileira de propriedade intelectual.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          E vedado ao usuario reproduzir, copiar, modificar, distribuir, vender ou criar obras
          derivadas com base em qualquer parte do aplicativo sem autorizacao previa e por escrito da
          Simplix.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          A licenca concedida ao usuario e limitada, pessoal, nao exclusiva, nao transferivel e
          revogavel, para uso do aplicativo conforme estes Termos (EULA — End User License Agreement).
        </p>
      </div>
    ),
  },
  {
    id: 'secao-10',
    num: '10',
    label: 'Responsabilidade',
    title: 'Limitacao de Responsabilidade',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          O Gamma atua como <strong className="text-white">plataforma de intermediacao</strong> entre passageiros e pilotos
          autonomos. A Simplix <strong className="text-white">nao e transportadora</strong> e nao executa diretamente o
          servico de transporte aquatico.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>A Simplix nao se responsabiliza por:</p>
        <ul className="space-y-2">
          {[
            <>Atrasos, cancelamentos ou indisponibilidade de pilotos.</>,
            <>Danos fisicos, materiais ou morais decorrentes da conducao das embarcacoes.</>,
            <>Condicoes climaticas ou maritimas adversas que impossibilitem o servico.</>,
            <>Falhas de conectividade de internet do usuario.</>,
            <>Perdas e danos indiretos, incidentais ou consequenciais.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            A responsabilidade maxima da Simplix, em qualquer hipotese, fica limitada ao valor pago
            pelo usuario na corrida objeto da reclamacao. O usuario utiliza o servico ciente dos
            riscos inerentes ao transporte aquatico e e sua responsabilidade verificar condicoes de
            segurança antes do embarque.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'secao-11',
    num: '11',
    label: 'Suspensao',
    title: 'Suspensao e Exclusao de Conta',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          A Simplix pode suspender ou encerrar sua conta, com ou sem aviso previo, nas seguintes situacoes:
        </p>
        <ul className="space-y-2">
          {[
            <>Violacao destes Termos de Uso.</>,
            <>Suspeita de fraude, uso indevido ou atividade ilegal.</>,
            <>Avaliacao consistentemente baixa que indique conduta inadequada.</>,
            <>Inatividade prolongada (mais de 24 meses).</>,
            <>Solicitacao do proprio usuario.</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Voce pode solicitar a exclusao de sua conta a qualquer momento pelo e-mail{' '}
          <a href="mailto:contato@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline transition-colors">
            contato@gamma.app.br
          </a>{' '}
          com o assunto "Exclusao de Conta". Dados serao tratados conforme a Politica de Privacidade.
        </p>
      </div>
    ),
  },
  {
    id: 'secao-12',
    num: '12',
    label: 'Legislacao',
    title: 'Legislacao Aplicavel e Foro',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Estes Termos sao regidos pelas leis da <strong className="text-white">Republica Federativa do Brasil</strong>.
          Fica eleito o foro da comarca do <strong className="text-white">Rio de Janeiro — RJ</strong> para dirimir quaisquer
          controversias oriundas destes Termos, com renûncia expressa a qualquer outro, por mais
          privilegiado que seja. O Codigo de Defesa do Consumidor (Lei 8.078/1990) e a LGPD (Lei
          13.709/2018) aplicam-se na integra onde couberem.
        </p>
      </div>
    ),
  },
  {
    id: 'secao-13',
    num: '13',
    label: 'Contato',
    title: 'Contato',
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Para duvidas, suporte ou exercicio de direitos, entre em contato:
        </p>
        <ul className="space-y-2">
          <li className="flex gap-3">
            <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
            <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <strong className="text-white">Suporte geral:</strong>{' '}
              <a href="mailto:contato@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline transition-colors">
                contato@gamma.app.br
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
            <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <strong className="text-white">Privacidade e dados pessoais (DPO):</strong>{' '}
              <a href="mailto:privacidade@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline transition-colors">
                privacidade@gamma.app.br
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
            <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <strong className="text-white">Empresa:</strong> Simplix — CNPJ 54.062.495/0001-02
            </span>
          </li>
        </ul>
      </div>
    ),
  },
];

const navItems = sections.map((s) => ({ id: s.id, label: s.label, num: s.num }));

const TermsOfUse = () => {
  return (
    <div style={{ background: '#000000', minHeight: '100dvh', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between py-4 px-6"
        style={{
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Logo size="sm" variant="white" />
        <Link
          to="/"
          className="text-sm transition-colors cursor-pointer"
          style={{
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px',
            borderRadius: '9999px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        >
          &larr; Voltar
        </Link>
      </header>

      {/* Hero */}
      <div className="text-center mx-auto px-6" style={{ maxWidth: '896px', paddingTop: '96px', paddingBottom: '64px' }}>
        <div
          className="inline-block text-xs px-3 py-1 rounded-full mb-6"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Legal
        </div>
        <h1
          className="font-black tracking-tight"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 3.75rem)', lineHeight: 1.05 }}
        >
          Termos de Uso
        </h1>
        <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Atualizado em marco de 2025
        </p>
        <div className="mt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* Content */}
      <div
        className="mx-auto px-6 pb-24"
        style={{ maxWidth: '1152px' }}
      >
        <div className="flex flex-col lg:grid gap-16" style={{ gridTemplateColumns: '240px 1fr' }}>

          {/* Sidebar nav */}
          <nav className="hidden lg:block">
            <div className="sticky" style={{ top: '96px' }}>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: '#22d3ee' }}
              >
                Indice
              </p>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="flex items-center gap-2 text-sm py-1 transition-colors cursor-pointer"
                      style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>
                        {item.num}
                      </span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Sections */}
          <div>
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="pt-12 pb-8"
                style={{
                  borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="font-black leading-none select-none"
                    style={{ fontSize: '2.25rem', color: 'rgba(255,255,255,0.08)' }}
                  >
                    {section.num}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: '#22d3ee' }}
                  >
                    {section.label}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
                {section.content}
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="text-center px-6 py-12"
        style={{
          background: '#000000',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            to="/privacy"
            className="text-sm transition-colors cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            Politica de Privacidade
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <Link
            to="/"
            className="text-sm transition-colors cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            Pagina inicial
          </Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Gamma &copy; {new Date().getFullYear()} Simplix
        </p>
      </footer>
    </div>
  );
};

export default TermsOfUse;
