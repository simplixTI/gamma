import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const NAV_ITEMS = [
  { id: 'secao-1',  num: '01', label: 'Quem somos' },
  { id: 'secao-2',  num: '02', label: 'Dados que coletamos' },
  { id: 'secao-3',  num: '03', label: 'Base legal' },
  { id: 'secao-4',  num: '04', label: 'Como usamos' },
  { id: 'secao-5',  num: '05', label: 'Compartilhamento' },
  { id: 'secao-6',  num: '06', label: 'Localização GPS' },
  { id: 'secao-7',  num: '07', label: 'Dados de pagamento' },
  { id: 'secao-8',  num: '08', label: 'Seus direitos' },
  { id: 'secao-9',  num: '09', label: 'Retenção e exclusão' },
  { id: 'secao-10', num: '10', label: 'Segurança' },
  { id: 'secao-11', num: '11', label: 'Menores de idade' },
  { id: 'secao-12', num: '12', label: 'Alterações' },
  { id: 'secao-13', num: '13', label: 'Contato e DPO' },
];

const CyanBullet = () => (
  <span
    className="flex-shrink-0 mt-2"
    style={{
      display: 'inline-block',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: '#22d3ee',
      marginTop: '8px',
    }}
  />
);

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState('secao-1');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      style={{ background: '#000000', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}
      className="min-h-screen"
    >
      {/* ── Sticky Header ── */}
      <header
        style={{
          background: 'rgba(0,0,0,0.80)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
        className="sticky top-0 z-50 py-4 px-6 flex items-center justify-between"
      >
        <Logo size="sm" variant="white" />
        <Link
          to="/"
          style={{
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.10)',
            fontSize: '14px',
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer hover:text-white"
        >
          <span style={{ fontSize: '12px' }}>←</span>
          Voltar
        </Link>
      </header>

      {/* ── Hero ── */}
      <div
        style={{ background: '#000000' }}
        className="pt-24 pb-16 px-6 text-center"
      >
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <span
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.40)',
              fontSize: '11px',
            }}
            className="inline-block px-3 py-1 rounded-full mb-6 uppercase tracking-widest font-semibold"
          >
            Legal
          </span>

          {/* Title */}
          <h1
            style={{ color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1.05 }}
            className="text-4xl sm:text-6xl font-black"
          >
            Política de Privacidade
          </h1>

          {/* Date */}
          <p
            style={{ color: 'rgba(255,255,255,0.40)', fontSize: '14px' }}
            className="mt-4"
          >
            Atualizado em março de 2025 — vigente a partir de 01 de abril de 2025
          </p>

          {/* Lead */}
          <p
            style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '640px', lineHeight: 1.7 }}
            className="text-base mt-6 mx-auto"
          >
            Esta política descreve como a Simplix coleta, usa, armazena e protege seus dados
            pessoais ao operar o aplicativo Gamma, em conformidade com a Lei Geral de Proteção
            de Dados (LGPD — Lei 13.709/2018).
          </p>

          {/* Divider */}
          <div
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            className="mt-12"
          />
        </div>
      </div>

      {/* ── Content layout ── */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:grid gap-12 lg:gap-16" style={{ gridTemplateColumns: '240px 1fr' }}>

          {/* ── Left nav (sticky on desktop) ── */}
          <nav className="hidden lg:block">
            <ul
              className="sticky space-y-1"
              style={{ top: '96px' }}
            >
              {NAV_ITEMS.map(({ id, num, label }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group"
                    style={{
                      background: activeSection === id ? 'rgba(34,211,238,0.06)' : 'transparent',
                      fontSize: '13px',
                      color: activeSection === id ? '#22d3ee' : 'rgba(255,255,255,0.38)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: activeSection === id ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.18)',
                        minWidth: '22px',
                      }}
                    >
                      {num}
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Sections ── */}
          <div className="space-y-0">

            {/* Section 1 */}
            <section
              id="secao-1"
              style={{ borderTop: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pb-12 mb-0"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>01</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Quem somos</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Controlador de Dados
              </h2>
              <div style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base space-y-3">
                <p>
                  O aplicativo <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Gamma</strong> é desenvolvido e operado pela{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Simplix</strong>, pessoa jurídica inscrita sob CNPJ{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>[CNPJ A PREENCHER]</strong>, com sede no Rio de Janeiro — RJ, Brasil.
                </p>
                <p>
                  Para os fins da Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD), a Simplix atua como{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>controladora</strong> dos dados pessoais tratados por meio do Gamma.
                </p>
                <p>
                  Contato do encarregado (DPO):{' '}
                  <a href="mailto:privacidade@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline">
                    privacidade@gamma.app.br
                  </a>
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section
              id="secao-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>02</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Dados coletados</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Quais dados coletamos e por quê
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Coletamos apenas os dados estritamente necessários para a prestação do serviço:
              </p>
              <div
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th
                        style={{ color: 'rgba(255,255,255,0.40)', fontSize: '11px', letterSpacing: '0.1em' }}
                        className="text-left px-4 py-3 uppercase font-semibold"
                      >
                        Dado
                      </th>
                      <th
                        style={{ color: 'rgba(255,255,255,0.40)', fontSize: '11px', letterSpacing: '0.1em' }}
                        className="text-left px-4 py-3 uppercase font-semibold"
                      >
                        Finalidade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Nome completo', 'Identificação do usuário e comunicação'],
                      ['E-mail', 'Autenticação e notificações de conta'],
                      ['CPF', 'Verificação de identidade e conformidade legal'],
                      ['Telefone', 'Comunicação operacional e segurança'],
                      ['Foto de perfil', 'Identificação visual durante corridas (opcional, com permissão explícita)'],
                      ['Localização GPS', 'Cálculo de rota, conexão piloto-passageiro, segurança da corrida'],
                      ['Histórico de corridas', 'Comprovante de uso, suporte ao cliente, obrigações fiscais'],
                      ['Dados de pagamento', 'Processamento de transações via Mercado Pago (PIX e cartão)'],
                      ['Dados bancários (pilotos)', 'Repasse de valores por serviços prestados'],
                      ['Dispositivo / SO', 'Envio de notificações push via Firebase FCM, diagnóstico técnico'],
                    ].map(([dado, finalidade], i) => (
                      <tr
                        key={dado}
                        style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <td
                          style={{ color: 'rgba(255,255,255,0.80)', fontSize: '14px', fontWeight: 500 }}
                          className="px-4 py-3 align-top whitespace-nowrap"
                        >
                          {dado}
                        </td>
                        <td
                          style={{ color: 'rgba(255,255,255,0.50)', fontSize: '14px' }}
                          className="px-4 py-3"
                        >
                          {finalidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mt-4">
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Dados de saúde:</strong> o Gamma não coleta nenhum dado relacionado à saúde dos usuários.
              </p>
            </section>

            {/* Section 3 */}
            <section
              id="secao-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>03</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Base legal</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Base legal para o tratamento (LGPD, Art. 7)
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Cada tratamento de dados possui fundamento legal específico:
              </p>
              <ul className="space-y-3">
                {[
                  ['Execução de contrato (Art. 7º, V)', 'Dados necessários para operar o serviço de transporte aquático — nome, e-mail, telefone, localização, pagamento.'],
                  ['Consentimento (Art. 7º, I)', 'Foto de perfil e comunicações de marketing. Você pode revogar seu consentimento a qualquer momento.'],
                  ['Obrigação legal (Art. 7º, II)', 'CPF, dados fiscais e registros de transação exigidos pela legislação brasileira.'],
                  ['Legítimo interesse (Art. 7º, IX)', 'Dados de dispositivo para segurança e prevenção a fraudes, respeitados os direitos e expectativas do titular.'],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                      <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{title}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 4 */}
            <section
              id="secao-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>04</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Como usamos</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Como usamos seus dados
              </h2>
              <ul className="space-y-3">
                {[
                  'Operar e intermediar o serviço de transporte aquático compartilhado',
                  'Conectar passageiros e pilotos disponíveis',
                  'Processar pagamentos e gerar comprovantes',
                  'Enviar notificações de status de corrida (push via Firebase FCM)',
                  'Calcular rotas e estimar tempo de chegada (Google Maps)',
                  'Apurar e repassar valores aos pilotos parceiros',
                  'Fornecer suporte ao cliente',
                  'Cumprir obrigações legais e regulatórias',
                  'Prevenir fraudes e garantir a segurança da plataforma',
                  'Melhorar continuamente o serviço com base em dados agregados e anonimizados',
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 5 */}
            <section
              id="secao-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>05</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Compartilhamento</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Compartilhamento com terceiros
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, lineHeight: 1.75 }} className="text-base mb-3">
                Seus dados nunca são vendidos a terceiros.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Compartilhamos informações de forma limitada e somente com as seguintes partes, sob acordos de confidencialidade e proteção de dados:
              </p>
              <ul className="space-y-3">
                {[
                  ['Pilotos parceiros', 'Nome e telefone, durante corridas ativas, para viabilizar o contato operacional.'],
                  ['Mercado Pago', 'Dados necessários para processar pagamentos (PIX e cartão de crédito). Os dados de cartão são tratados diretamente pelo Mercado Pago, conforme sua própria política de privacidade. O Gamma não armazena dados de cartão em seus servidores.'],
                  ['Google Maps Platform', 'Coordenadas de origem e destino para cálculo de rotas e exibição de mapas.'],
                  ['Firebase (Google LLC) — FCM', 'Identificador de dispositivo para envio de notificações push.'],
                  ['Supabase', 'Provedor de infraestrutura de banco de dados (servidores com sede nos EUA, com cláusulas contratuais padrão de proteção de dados).'],
                  ['Autoridades públicas', 'Quando exigido por lei, ordem judicial ou procedimento legal.'],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                      <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{title}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 6 */}
            <section
              id="secao-6"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>06</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Localização GPS</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Localização GPS
              </h2>
              <div style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base space-y-3">
                <p>
                  O Gamma acessa sua localização em tempo real{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>somente durante corridas ativas</strong> e mediante sua permissão explícita concedida pelo sistema operacional do dispositivo.
                </p>
                <p>
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Não realizamos rastreamento em segundo plano</strong> quando não há corrida em andamento. A localização é usada exclusivamente para:
                </p>
              </div>
              <ul className="space-y-3 mt-4">
                {[
                  'Identificar o ponto de embarque do passageiro',
                  'Exibir a posição da embarcação em tempo real',
                  'Calcular a rota e o valor da corrida',
                  'Garantir a segurança durante o trajeto',
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mt-4">
                Você pode revogar a permissão de localização nas configurações do seu dispositivo a qualquer momento, o que poderá limitar o funcionamento do aplicativo.
              </p>
            </section>

            {/* Section 7 */}
            <section
              id="secao-7"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>07</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Pagamento</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Dados de pagamento
              </h2>
              <div style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base space-y-3">
                <p>
                  Os pagamentos são processados pelo{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Mercado Pago</strong>, um processador de pagamentos certificado PCI-DSS. O Gamma{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>não armazena números de cartão de crédito, CVV ou dados bancários completos</strong> em seus próprios servidores.
                </p>
                <p>
                  Armazenamos apenas: confirmação de transação, valor cobrado, data, método de pagamento (ex.: PIX ou cartão) e identificador da transação gerado pelo Mercado Pago — dados necessários para suporte ao cliente e obrigações fiscais.
                </p>
                <p>
                  Para pilotos, coletamos dados bancários para fins de repasse, tratados com criptografia em repouso e acesso restrito.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section
              id="secao-8"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>08</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Seus direitos</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Seus direitos como titular (LGPD)
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Nos termos da LGPD, você tem os seguintes direitos, exercíveis mediante solicitação pelo e-mail{' '}
                <a href="mailto:privacidade@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline">
                  privacidade@gamma.app.br
                </a>
                :
              </p>
              <ul className="space-y-3">
                {[
                  ['Acesso', 'Saber quais dados seus nós tratamos.'],
                  ['Correção', 'Corrigir dados incompletos, inexatos ou desatualizados.'],
                  ['Exclusão', 'Solicitar a exclusão de dados desnecessários ou tratados com base em consentimento. Dados exigidos por lei serão mantidos pelo prazo legal.'],
                  ['Portabilidade', 'Receber seus dados em formato estruturado e interoperável.'],
                  ['Revogação do consentimento', 'Retirar consentimentos concedidos anteriormente a qualquer momento.'],
                  ['Informação sobre compartilhamento', 'Saber com quem seus dados são compartilhados.'],
                  ['Oposição', 'Opor-se a tratamentos realizados com base em legítimo interesse.'],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                      <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{title}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mt-4">
                Responderemos às solicitações em até <strong style={{ color: 'rgba(255,255,255,0.85)' }}>15 dias úteis</strong>. Para solicitar a exclusão completa de sua conta e dados, envie e-mail com o assunto "Exclusão de Conta" para{' '}
                <a href="mailto:contato@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline">
                  contato@gamma.app.br
                </a>
                .
              </p>
            </section>

            {/* Section 9 */}
            <section
              id="secao-9"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>09</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Retenção</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Retenção e exclusão de dados
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Mantemos seus dados pelos seguintes prazos:
              </p>
              <ul className="space-y-3">
                {[
                  ['Dados de conta ativa', 'Enquanto a conta estiver ativa.'],
                  ['Dados de transação e histórico de corridas', '5 anos após a corrida, conforme obrigações fiscais e tributárias brasileiras.'],
                  ['Dados de localização de corridas encerradas', '90 dias para fins de suporte e segurança.'],
                  ['Logs de acesso', '6 meses, conforme o Marco Civil da Internet (Lei 12.965/2014).'],
                  ['Após exclusão de conta', 'Dados pessoais identificáveis são removidos em até 30 dias, salvo os retidos por obrigação legal.'],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                      <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{title}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 10 */}
            <section
              id="secao-10"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>10</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Segurança</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Segurança
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Adotamos as seguintes medidas técnicas e organizacionais para proteger seus dados:
              </p>
              <ul className="space-y-3">
                {[
                  'Criptografia em trânsito via HTTPS/TLS 1.2+',
                  'Criptografia em repouso para dados sensíveis',
                  'Row Level Security (RLS) no banco de dados — cada usuário acessa apenas seus dados',
                  'Autenticação multifator disponível para contas de pilotos',
                  'Acesso interno restrito ao princípio do menor privilégio',
                  'Monitoramento de atividades suspeitas e prevenção a fraudes',
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <CyanBullet />
                    <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mt-4">
                Em caso de incidente de segurança que possa afetar seus dados, notificaremos a ANPD e os titulares afetados conforme exigido pela LGPD.
              </p>
            </section>

            {/* Section 11 */}
            <section
              id="secao-11"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>11</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Menores</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Menores de idade
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                O Gamma é um serviço destinado exclusivamente a pessoas com{' '}
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>18 anos ou mais</strong>. Não coletamos intencionalmente dados de menores de 18 anos. Caso identifiquemos que dados de um menor foram coletados sem consentimento dos responsáveis, excluiremos essas informações imediatamente. Se você acredita que coletamos dados de um menor, entre em contato pelo e-mail{' '}
                <a href="mailto:privacidade@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline">
                  privacidade@gamma.app.br
                </a>
                .
              </p>
            </section>

            {/* Section 12 */}
            <section
              id="secao-12"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              className="pt-12 pb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>12</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Alterações</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Alterações nesta política
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças no serviço ou na legislação. Notificaremos você por e-mail ou notificação no aplicativo com pelo menos{' '}
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>15 dias de antecedência</strong> antes de mudanças materiais entrarem em vigor. O uso continuado do serviço após esse prazo implica aceitação da nova versão.
              </p>
            </section>

            {/* Section 13 */}
            <section
              id="secao-13"
              className="pt-12 pb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>13</span>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em' }} className="uppercase">Contato</span>
              </div>
              <h2 style={{ color: '#ffffff' }} className="text-2xl font-bold mb-4">
                Contato e Encarregado (DPO)
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base mb-4">
                Para questões relacionadas a privacidade e proteção de dados:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <CyanBullet />
                  <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>E-mail DPO / Privacidade:</strong>{' '}
                    <a href="mailto:privacidade@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline">
                      privacidade@gamma.app.br
                    </a>
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <CyanBullet />
                  <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Suporte geral / Exclusão de conta:</strong>{' '}
                    <a href="mailto:contato@gamma.app.br" style={{ color: '#22d3ee' }} className="hover:underline">
                      contato@gamma.app.br
                    </a>
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <CyanBullet />
                  <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Empresa:</strong> Simplix — CNPJ [CNPJ A PREENCHER]
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <CyanBullet />
                  <span style={{ color: 'rgba(255,255,255,0.60)', lineHeight: 1.75 }} className="text-base">
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Autoridade competente:</strong> Autoridade Nacional de Proteção de Dados —{' '}
                    <a
                      href="https://www.gov.br/anpd"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#22d3ee' }}
                      className="hover:underline"
                    >
                      www.gov.br/anpd
                    </a>
                  </span>
                </li>
              </ul>
            </section>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          background: '#000000',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
        className="py-12 px-6 text-center"
      >
        <p style={{ color: 'rgba(255,255,255,0.30)', fontSize: '14px' }} className="mb-3">
          Gamma &copy; {new Date().getFullYear()} Simplix
        </p>
        <div className="flex items-center justify-center gap-6">
          <Link
            to="/terms"
            style={{ color: 'rgba(255,255,255,0.30)', fontSize: '14px' }}
            className="hover:text-white transition-colors duration-200 cursor-pointer"
          >
            Termos de Uso
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
          <Link
            to="/"
            style={{ color: 'rgba(255,255,255,0.30)', fontSize: '14px' }}
            className="hover:text-white transition-colors duration-200 cursor-pointer"
          >
            Início
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
