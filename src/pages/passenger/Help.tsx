import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const finalSubject = subject === 'Outro' ? customSubject.trim() : subject;
    if (!finalSubject) { toast.error('Selecione ou informe o assunto'); return; }
    if (!message.trim()) { toast.error('Escreva sua mensagem'); return; }

    setIsSending(true);
    // TODO: integrate with email/support service
    await new Promise((r) => setTimeout(r, 800));
    setIsSending(false);
    setSent(true);
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
