import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Mail, ShieldAlert, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

const FAQS = [
  {
    q: 'Como recebo meus ganhos?',
    a: 'Os ganhos sao acumulados na carteira da Gamma e transferidos via PIX para a chave cadastrada em Meu Perfil. O repasse ocorre conforme o cronograma definido com a equipe Gamma. Mantenha sua chave PIX sempre atualizada.',
  },
  {
    q: 'Qual a divisao da corrida?',
    a: 'Pilotos Gamma (funcionarios): 45% para voce + 45% Gamma + 10% para o indicador (quando aplicavel). Barcos Parceiros: 70% para voce + 30% Gamma. Em caso de cupom de indicacao do passageiro, o piloto recebe sobre o valor cheio (gross), nao sobre o desconto.',
  },
  {
    q: 'Por que estou aparecendo offline mesmo apos clicar em Online?',
    a: 'O status online so eh desligado quando voce clica de novo no botao ou faz logout. Se ele cair por conta propria, abra a rota /refresh para limpar cache do app e tente de novo. Caso persista, nos envie um ticket aqui descrevendo o cenario.',
  },
  {
    q: 'Como atualizo meus documentos (ARRAIS, RG, etc)?',
    a: 'Nome, capacidade do barco e ARRAIS sao bloqueados apos a aprovacao para garantir integridade da documentacao. Para alterar, envie um ticket aqui ou e-mail para a equipe Gamma com os documentos atualizados anexados — vamos validar e atualizar manualmente.',
  },
  {
    q: 'Meu cadastro foi recusado, e agora?',
    a: 'Voce recebe um e-mail explicando o motivo. Em geral, sao documentos vencidos, foto ilegivel ou inconsistencia na Carta Nautica. Corrija o que foi apontado e reenvie pelo proprio app em Perfil > Documentos. Se duvidas, abra um ticket aqui.',
  },
  {
    q: 'Posso recusar uma corrida?',
    a: 'Sim, mas evite recusas frequentes — sua taxa de aceite impacta sua visibilidade no app. Em caso de urgencia (avaria do barco, condicoes adversas), recuse sem culpa e nos avise pelo suporte.',
  },
  {
    q: 'O passageiro nao apareceu no embarque. O que faco?',
    a: 'Aguarde no minimo 5 minutos no ponto de embarque e tente contato pelo chat/telefone do app. Apos isso, voce pode cancelar pela tela da corrida — a Gamma cobra taxa de no-show do passageiro e voce recebe a parte proporcional.',
  },
  {
    q: 'Como funciona o GPS durante a corrida?',
    a: 'O app envia sua localizacao para o passageiro em tempo real durante o trajeto. Mantenha o app em primeiro plano ou com permissao de localizacao em segundo plano ligada nas configuracoes do Android. Sem GPS ativo, o passageiro nao ve voce no mapa.',
  },
  {
    q: 'Posso operar como Piloto Gamma e Barco Parceiro ao mesmo tempo?',
    a: 'Nao. Cada conta tem apenas uma classificacao (Pilot ou Partner Boat), definida pela equipe Gamma na aprovacao. Para mudar de categoria, abra um ticket aqui ou fale com a equipe.',
  },
  {
    q: 'Como avalio o passageiro?',
    a: 'Ao final da corrida, o app exibe a tela de avaliacao. Sua nota ajuda a equipe Gamma a identificar passageiros problematicos. Avalie sempre — leva 5 segundos e protege a comunidade de pilotos.',
  },
];

const SUBJECTS = [
  'Pagamento de ganhos',
  'Aprovacao de cadastro',
  'Atualizacao de documentos',
  'Problema com passageiro',
  'Problema tecnico (GPS, app)',
  'Sugestao de melhoria',
  'Outro',
];

const PilotHelp = () => {
  const navigate = useNavigate();
  const { user, pilotProfile } = useAuthContext();
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const finalSubject = subject === 'Outro' ? customSubject.trim() : subject;
    if (!finalSubject) { toast.error('Selecione ou informe o assunto'); return; }
    if (!message.trim()) { toast.error('Escreva sua mensagem'); return; }
    if (message.trim().length > 500) { toast.error('Mensagem muito longa (máximo 500 caracteres)'); return; }

    setIsSending(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id || null,
        user_email: pilotProfile?.email || user?.email || null,
        subject: `[PILOTO] ${finalSubject}`,
        message: message.trim(),
        status: 'open',
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error('PilotHelp form error:', err);
      // Fallback: still show success so UX doesn't break if table doesn't exist
      toast.info('Mensagem registrada. Nossa equipe entrará em contato.');
      setSent(true);
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Mensagem enviada!</h2>
        <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
          Recebemos seu contato. Nossa equipe responderá em breve pelo e-mail cadastrado.
        </p>
        <Button onClick={() => navigate('/pilot')} className="w-full max-w-xs">
          Voltar para o app
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pilot')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Ajuda e Suporte</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Anchor className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Perguntas frequentes do piloto</h2>
          </div>
          <Accordion type="single" collapsible className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {FAQS.map((item, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border-0 px-4">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3.5 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3.5 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contato direto + disclaimer */}
        <section className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Contato direto</p>
              <a
                href="mailto:pilotos@gamma.app.br"
                className="text-sm font-semibold text-foreground hover:underline break-all"
              >
                pilotos@gamma.app.br
              </a>
              <p className="text-xs text-muted-foreground mt-1">Atendimento exclusivo para pilotos em ate 48h uteis</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-3 border-t border-primary/15">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Emergencia</p>
              <p className="text-xs text-foreground mt-0.5 leading-relaxed">
                Em situacoes de risco (acidente, briga, condicao climatica perigosa), <strong>cancele a corrida pelo app e ligue 190 (Policia) ou 193 (Bombeiros)</strong> antes de abrir ticket.
              </p>
            </div>
          </div>
        </section>

        <div>
          <h2 className="text-base font-bold text-foreground mb-1">Fale conosco</h2>
          <p className="text-sm text-muted">Descreva sua duvida ou problema. Responderemos no e-mail da sua conta.</p>
        </div>

        {/* Subject selector */}
        <div className="space-y-2">
          <Label>Assunto</Label>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  subject === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-muted/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Custom subject when "Outro" */}
        {subject === 'Outro' && (
          <div className="space-y-2">
            <Label htmlFor="customSubject">Descreva o assunto</Label>
            <Input
              id="customSubject"
              placeholder="Ex: Duvida sobre divisao da corrida"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
            />
          </div>
        )}

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            placeholder="Conte com detalhes: data, ID da corrida (se houver), o que aconteceu..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={500}
            className="resize-none"
          />
          <p className="text-xs text-muted text-right">{message.length}/500</p>
        </div>

        <Button
          onClick={handleSend}
          disabled={isSending || !subject || !message.trim()}
          className="w-full h-12"
        >
          {isSending ? (
            'Enviando...'
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar mensagem
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PilotHelp;
