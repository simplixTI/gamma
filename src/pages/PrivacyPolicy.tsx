import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, FileText } from 'lucide-react';
import Logo from '@/components/Logo';

const sections = [
  {
    id: 'secao-1',
    title: '1. Quem somos — Controlador de Dados',
    content: (
      <>
        <p>
          O aplicativo <strong>Gamma</strong> é desenvolvido e operado pela <strong>Simplix</strong>,
          pessoa jurídica inscrita sob CNPJ <strong>[CNPJ A PREENCHER]</strong>, com sede no Rio de
          Janeiro — RJ, Brasil.
        </p>
        <p>
          Para os fins da Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD), a Simplix atua
          como <strong>controladora</strong> dos dados pessoais tratados por meio do Gamma.
        </p>
        <p>
          Contato do encarregado (DPO):{' '}
          <a href="mailto:privacidade@gamma.app.br" className="text-blue-400 underline">
            privacidade@gamma.app.br
          </a>
        </p>
      </>
    ),
  },
  {
    id: 'secao-2',
    title: '2. Quais dados coletamos e por quê',
    content: (
      <>
        <p>Coletamos apenas os dados estritamente necessários para a prestação do serviço:</p>
        <table className="w-full text-sm mt-3 border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 font-semibold text-foreground">Dado</th>
              <th className="text-left py-2 font-semibold text-foreground">Finalidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
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
            ].map(([dado, finalidade]) => (
              <tr key={dado}>
                <td className="py-2 pr-4 text-foreground font-medium align-top">{dado}</td>
                <td className="py-2 text-muted-foreground">{finalidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">
          <strong>Dados de saúde:</strong> o Gamma não coleta nenhum dado relacionado à saúde dos
          usuários.
        </p>
      </>
    ),
  },
  {
    id: 'secao-3',
    title: '3. Base legal para o tratamento (LGPD, Art. 7)',
    content: (
      <>
        <p>Cada tratamento de dados possui fundamento legal específico:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>Execução de contrato</strong> (Art. 7º, V): dados necessários para operar o
            serviço de transporte aquático — nome, e-mail, telefone, localização, pagamento.
          </li>
          <li>
            <strong>Consentimento</strong> (Art. 7º, I): foto de perfil e comunicações de marketing.
            Você pode revogar seu consentimento a qualquer momento.
          </li>
          <li>
            <strong>Obrigação legal</strong> (Art. 7º, II): CPF, dados fiscais e registros de
            transação exigidos pela legislação brasileira.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (Art. 7º, IX): dados de dispositivo para segurança e
            prevenção a fraudes, respeitados os direitos e expectativas do titular.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-4',
    title: '4. Como usamos seus dados',
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li>Operar e intermediar o serviço de transporte aquático compartilhado</li>
        <li>Conectar passageiros e pilotos disponíveis</li>
        <li>Processar pagamentos e gerar comprovantes</li>
        <li>Enviar notificações de status de corrida (push via Firebase FCM)</li>
        <li>Calcular rotas e estimar tempo de chegada (Google Maps)</li>
        <li>Apurar e repassar valores aos pilotos parceiros</li>
        <li>Fornecer suporte ao cliente</li>
        <li>Cumprir obrigações legais e regulatórias</li>
        <li>Prevenir fraudes e garantir a segurança da plataforma</li>
        <li>
          Melhorar continuamente o serviço com base em dados agregados e anonimizados
        </li>
      </ul>
    ),
  },
  {
    id: 'secao-5',
    title: '5. Compartilhamento com terceiros',
    content: (
      <>
        <p className="font-semibold text-foreground">
          Seus dados nunca são vendidos a terceiros.
        </p>
        <p className="mt-2">
          Compartilhamos informações de forma limitada e somente com as seguintes partes, sob
          acordos de confidencialidade e proteção de dados:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>Pilotos parceiros:</strong> nome e telefone, durante corridas ativas, para
            viabilizar o contato operacional.
          </li>
          <li>
            <strong>Mercado Pago:</strong> dados necessários para processar pagamentos (PIX e
            cartão de crédito). Os dados de cartão são tratados diretamente pelo Mercado Pago,
            conforme sua própria política de privacidade. O Gamma não armazena dados de cartão em
            seus servidores.
          </li>
          <li>
            <strong>Google Maps Platform:</strong> coordenadas de origem e destino para cálculo de
            rotas e exibição de mapas.
          </li>
          <li>
            <strong>Firebase (Google LLC) — FCM:</strong> identificador de dispositivo para envio
            de notificações push.
          </li>
          <li>
            <strong>Supabase:</strong> provedor de infraestrutura de banco de dados (servidores com
            sede nos EUA, com cláusulas contratuais padrão de proteção de dados).
          </li>
          <li>
            <strong>Autoridades públicas:</strong> quando exigido por lei, ordem judicial ou
            procedimento legal.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-6',
    title: '6. Localização GPS',
    content: (
      <>
        <p>
          O Gamma acessa sua localização em tempo real <strong>somente durante corridas ativas</strong>{' '}
          e mediante sua permissão explícita concedida pelo sistema operacional do dispositivo.
        </p>
        <p className="mt-2">
          <strong>Não realizamos rastreamento em segundo plano</strong> quando não há corrida em
          andamento. A localização é usada exclusivamente para:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Identificar o ponto de embarque do passageiro</li>
          <li>Exibir a posição da embarcação em tempo real</li>
          <li>Calcular a rota e o valor da corrida</li>
          <li>Garantir a segurança durante o trajeto</li>
        </ul>
        <p className="mt-2">
          Você pode revogar a permissão de localização nas configurações do seu dispositivo a
          qualquer momento, o que poderá limitar o funcionamento do aplicativo.
        </p>
      </>
    ),
  },
  {
    id: 'secao-7',
    title: '7. Dados de pagamento',
    content: (
      <>
        <p>
          Os pagamentos são processados pelo <strong>Mercado Pago</strong>, um processador de
          pagamentos certificado PCI-DSS. O Gamma <strong>não armazena números de cartão de
          crédito, CVV ou dados bancários completos</strong> em seus próprios servidores.
        </p>
        <p className="mt-2">
          Armazenamos apenas: confirmação de transação, valor cobrado, data, método de pagamento
          (ex.: PIX ou cartão) e identificador da transação gerado pelo Mercado Pago — dados
          necessários para suporte ao cliente e obrigações fiscais.
        </p>
        <p className="mt-2">
          Para pilotos, coletamos dados bancários para fins de repasse, tratados com criptografia
          em repouso e acesso restrito.
        </p>
      </>
    ),
  },
  {
    id: 'secao-8',
    title: '8. Seus direitos como titular (LGPD)',
    content: (
      <>
        <p>
          Nos termos da LGPD, você tem os seguintes direitos, exercíveis mediante solicitação pelo
          e-mail{' '}
          <a href="mailto:privacidade@gamma.app.br" className="text-blue-400 underline">
            privacidade@gamma.app.br
          </a>
          :
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>Acesso:</strong> saber quais dados seus nós tratamos.
          </li>
          <li>
            <strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados.
          </li>
          <li>
            <strong>Exclusão:</strong> solicitar a exclusão de dados desnecessários ou tratados com
            base em consentimento. Dados exigidos por lei serão mantidos pelo prazo legal.
          </li>
          <li>
            <strong>Portabilidade:</strong> receber seus dados em formato estruturado e
            interoperável.
          </li>
          <li>
            <strong>Revogação do consentimento:</strong> retirar consentimentos concedidos
            anteriormente a qualquer momento.
          </li>
          <li>
            <strong>Informação sobre compartilhamento:</strong> saber com quem seus dados são
            compartilhados.
          </li>
          <li>
            <strong>Oposição:</strong> opor-se a tratamentos realizados com base em legítimo
            interesse.
          </li>
        </ul>
        <p className="mt-3">
          Responderemos às solicitações em até <strong>15 dias úteis</strong>. Para solicitar a
          exclusão completa de sua conta e dados, envie e-mail com o assunto "Exclusão de Conta"
          para{' '}
          <a href="mailto:contato@gamma.app.br" className="text-blue-400 underline">
            contato@gamma.app.br
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'secao-9',
    title: '9. Retenção e exclusão de dados',
    content: (
      <>
        <p>Mantemos seus dados pelos seguintes prazos:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>Dados de conta ativa:</strong> enquanto a conta estiver ativa.
          </li>
          <li>
            <strong>Dados de transação e histórico de corridas:</strong> 5 anos após a corrida,
            conforme obrigações fiscais e tributárias brasileiras.
          </li>
          <li>
            <strong>Dados de localização de corridas encerradas:</strong> 90 dias para fins de
            suporte e segurança.
          </li>
          <li>
            <strong>Logs de acesso:</strong> 6 meses, conforme o Marco Civil da Internet (Lei
            12.965/2014).
          </li>
          <li>
            <strong>Após exclusão de conta:</strong> dados pessoais identificáveis são removidos em
            até 30 dias, salvo os retidos por obrigação legal.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'secao-10',
    title: '10. Segurança',
    content: (
      <>
        <p>Adotamos as seguintes medidas técnicas e organizacionais para proteger seus dados:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>Criptografia em trânsito via HTTPS/TLS 1.2+</li>
          <li>Criptografia em repouso para dados sensíveis</li>
          <li>Row Level Security (RLS) no banco de dados — cada usuário acessa apenas seus dados</li>
          <li>Autenticação multifator disponível para contas de pilotos</li>
          <li>Acesso interno restrito ao princípio do menor privilégio</li>
          <li>Monitoramento de atividades suspeitas e prevenção a fraudes</li>
        </ul>
        <p className="mt-2">
          Em caso de incidente de segurança que possa afetar seus dados, notificaremos a ANPD e os
          titulares afetados conforme exigido pela LGPD.
        </p>
      </>
    ),
  },
  {
    id: 'secao-11',
    title: '11. Menores de idade',
    content: (
      <p>
        O Gamma é um serviço destinado exclusivamente a pessoas com <strong>18 anos ou mais</strong>.
        Não coletamos intencionalmente dados de menores de 18 anos. Caso identifiquemos que dados de
        um menor foram coletados sem consentimento dos responsáveis, excluiremos essas informações
        imediatamente. Se você acredita que coletamos dados de um menor, entre em contato pelo
        e-mail{' '}
        <a href="mailto:privacidade@gamma.app.br" className="text-blue-400 underline">
          privacidade@gamma.app.br
        </a>
        .
      </p>
    ),
  },
  {
    id: 'secao-12',
    title: '12. Alterações nesta política',
    content: (
      <p>
        Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças no
        serviço ou na legislação. Notificaremos você por e-mail ou notificação no aplicativo com
        pelo menos <strong>15 dias de antecedência</strong> antes de mudanças materiais entrarem em
        vigor. O uso continuado do serviço após esse prazo implica aceitação da nova versão.
      </p>
    ),
  },
  {
    id: 'secao-13',
    title: '13. Contato e Encarregado (DPO)',
    content: (
      <>
        <p>Para questões relacionadas a privacidade e proteção de dados:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>E-mail DPO / Privacidade:</strong>{' '}
            <a href="mailto:privacidade@gamma.app.br" className="text-blue-400 underline">
              privacidade@gamma.app.br
            </a>
          </li>
          <li>
            <strong>Suporte geral / Exclusão de conta:</strong>{' '}
            <a href="mailto:contato@gamma.app.br" className="text-blue-400 underline">
              contato@gamma.app.br
            </a>
          </li>
          <li>
            <strong>Empresa:</strong> Simplix — CNPJ [CNPJ A PREENCHER]
          </li>
          <li>
            <strong>Autoridade competente:</strong> Autoridade Nacional de Proteção de Dados —{' '}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              www.gov.br/anpd
            </a>
          </li>
        </ul>
      </>
    ),
  },
];

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-primary text-primary-foreground font-[Inter,sans-serif]">
      {/* Header */}
      <header className="sticky top-0 bg-primary/95 backdrop-blur-sm z-10 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center gap-4 px-5 py-4">
          <Link
            to="/"
            aria-label="Voltar ao início"
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
          <Shield className="w-6 h-6 text-blue-400 shrink-0" />
          <h1 className="text-2xl font-bold tracking-tight">Politica de Privacidade</h1>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Atualizado em marco de 2025 &mdash; vigente a partir de 01 de abril de 2025
        </p>
        <p className="mt-4 text-sm text-primary-foreground/80 leading-relaxed">
          Esta politica descreve como a Simplix coleta, usa, armazena e protege seus dados pessoais
          ao operar o aplicativo Gamma, em conformidade com a Lei Geral de Protecao de Dados (LGPD
          — Lei 13.709/2018).
        </p>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-5 pb-16 space-y-4">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-xl border border-border/50 bg-card p-6 space-y-3"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.04)' }}
          >
            <h2 className="text-base font-bold text-foreground flex items-start gap-2 leading-snug">
              {section.title}
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              {section.content}
            </div>
          </section>
        ))}

        {/* Footer links */}
        <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-primary-foreground/50">
          <span>Gamma &copy; {new Date().getFullYear()} Simplix</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary-foreground transition-colors underline underline-offset-2">
              Termos de Uso
            </Link>
            <Link to="/" className="hover:text-primary-foreground transition-colors underline underline-offset-2">
              Voltar ao inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
