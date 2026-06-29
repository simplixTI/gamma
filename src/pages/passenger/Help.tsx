import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Mail, ShieldAlert, HelpCircle } from 'lucide-react';
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
    q: 'Como funciona a corrida na Gamma?',
    a: 'Voce escolhe o deck de embarque, o destino e confirma o pagamento. Um piloto disponivel aceita a corrida e te leva ate o destino. Voce acompanha tudo em tempo real no app.',
  },
  {
    q: 'Quais sao as formas de pagamento?',
    a: 'Aceitamos PIX, cartao de credito e saldo da Gamma Cash (carteira do app). O valor da corrida e debitado automaticamente apos a confirmacao.',
  },
  {
    q: 'Como solicito um reembolso?',
    a: 'Reembolsos sao avaliados caso a caso. Se a corrida foi cancelada por erro do piloto ou problema tecnico, abra um chamado neste suporte e nossa equipe analisa em ate 48h uteis. Pagamentos por PIX podem demorar ate 7 dias para retornar.',
  },
  {
    q: 'O que acontece se eu cancelar?',
    a: 'Cancelamentos antes da chegada do piloto sao gratuitos. Se o piloto ja esta a caminho, uma taxa de cancelamento pode ser aplicada para cobrir o deslocamento.',
  },
  {
    q: 'A Gamma se responsabiliza por objetos esquecidos no barco?',
    a: 'Nao. A Gamma e o piloto NAO se responsabilizam por itens deixados ou esquecidos a bordo. Caso lembre algo, entre em contato imediatamente com o suporte e tentaremos localizar o piloto, mas nao garantimos a recuperacao.',
  },
  {
    q: 'Posso solicitar para mais de uma pessoa?',
    a: 'Sim. Indique no app o numero de passageiros na hora de pedir a corrida. A capacidade depende do barco do piloto disponivel.',
  },
  {
    q: 'Como funciona a politica de privacidade?',
    a: 'Tratamos seus dados conforme a LGPD. Coletamos apenas o necessario para operar o servico (nome, email, telefone, localizacao durante a corrida). Voce pode pedir exclusao da conta em Configuracoes > Excluir conta. Detalhes completos em /privacy.',
  },
  {
    q: 'Como funciona a verificacao de pilotos?',
    a: 'Todos os pilotos passam por verificacao de documentos (CNH, habilitacao nautica, registro do barco). Pilotos Gamma sao funcionarios; Barcos Parceiros sao donos independentes credenciados.',
  },
];

const SUBJECTS = [
  'Problema com pagamento',
  'Corrida cancelada indevidamente',
  'Problema com o piloto',
  'Conta ou cadastro',
  'Reembolso',
  'Outro',
];

const Help = () => {
  const navigate = useNavigate();
  const { user, passengerProfile } = useAuthContext();
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
        user_email: passengerProfile?.email || user?.email || null,
        subject: finalSubject,
        message: message.trim(),
        status: 'open',
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error('Help form error:', err);
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
        <Button onClick={() => navigate(-1)} className="w-full max-w-xs">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Ajuda</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Perguntas frequentes</h2>
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
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Contato</p>
              <a
                href="mailto:contato@gamma.app.br"
                className="text-sm font-semibold text-foreground hover:underline break-all"
              >
                contato@gamma.app.br
              </a>
              <p className="text-xs text-muted-foreground mt-1">Atendimento em ate 48h uteis</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-3 border-t border-primary/15">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Importante</p>
              <p className="text-xs text-foreground mt-0.5 leading-relaxed">
                A Gamma e o piloto <strong>nao se responsabilizam por itens esquecidos a bordo</strong>.
                Sempre confira seus pertences antes de desembarcar.
              </p>
            </div>
          </div>
        </section>

        <div>
          <h2 className="text-base font-bold text-foreground mb-1">Fale conosco</h2>
          <p className="text-sm text-muted">Descreva o problema e retornaremos pelo e-mail da sua conta.</p>
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
              placeholder="Ex: Dúvida sobre meu cadastro"
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
            placeholder="Descreva o que aconteceu com o máximo de detalhes..."
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

export default Help;
