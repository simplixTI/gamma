import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

// Rota PUBLICA — exigida pelo Google Play (sem login).
// https://support.google.com/googleplay/android-developer/answer/13327111
const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, passengerProfile, pilotProfile } = useAuthContext();
  const isLoggedIn = !!user;
  const profileEmail = passengerProfile?.email || pilotProfile?.email || user?.email || '';

  const [email, setEmail] = useState(profileEmail);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState<'self' | 'ticket' | null>(null);

  const handleSelfDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      await supabase.rpc('request_account_deletion', { p_user_id: user.id });
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error || (data && !data.success)) {
        throw new Error(error?.message ?? data?.error ?? 'Erro ao deletar conta');
      }
      setSent('self');
      setTimeout(() => supabase.auth.signOut(), 500);
    } catch (err) {
      console.error('[DeleteAccount] self delete failed:', err);
      toast.error('Nao foi possivel excluir agora. Tente abrir um ticket abaixo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketRequest = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Informe um email valido');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: null,
        user_email: email.trim(),
        subject: `[EXCLUSAO DE CONTA] ${email.trim()}`,
        message: reason.trim() || 'Solicitacao publica via /excluir-conta',
        status: 'open',
      });
      if (error) throw error;
      setSent('ticket');
    } catch (err) {
      console.error('[DeleteAccount] ticket failed:', err);
      toast.info('Pedido registrado. Nossa equipe entrara em contato.');
      setSent('ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {sent === 'self' ? 'Conta excluida' : 'Pedido registrado'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
          {sent === 'self'
            ? 'Sua conta e seus dados pessoais foram removidos. Voce ja foi deslogado.'
            : 'Recebemos seu pedido. A equipe Gamma processara a exclusao em ate 30 dias e responderemos por email.'}
        </p>
        <Button onClick={() => navigate('/')} className="w-full max-w-xs">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Excluir conta e dados</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            O que sera removido
          </h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>• Dados pessoais (nome, CPF, telefone, email)</li>
            <li>• Foto de perfil</li>
            <li>• Endereco e localizacao</li>
            <li>• Chave PIX e dados de pagamento</li>
            <li>• Historico de mensagens com pilotos</li>
            <li>• Cupons e indicacoes pendentes</li>
            <li>• Documentos enviados (RG, CNH, Carta Nautica)</li>
          </ul>
        </section>

        <section className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            O que ficamos obrigados a reter
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Por exigencia legal (LGPD art. 16, IV + Codigo Tributario), retemos
            por <strong>5 anos</strong> os registros financeiros das corridas concluidas
            (sem dados pessoais identificaveis): valor, data, rota e codigo de transacao
            do pagamento. Esses dados sao usados apenas para auditoria fiscal e nao
            identificam mais sua conta apos a exclusao.
          </p>
        </section>

        {isLoggedIn && (
          <section className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Excluir agora</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Voce esta logado como <strong>{profileEmail || 'sua conta'}</strong>.
                A exclusao eh imediata e nao pode ser desfeita.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Digite <strong>EXCLUIR</strong> para confirmar</Label>
              <Input
                id="confirm"
                placeholder="EXCLUIR"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoCapitalize="characters"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleSelfDelete}
              disabled={isSubmitting || confirmText.trim().toUpperCase() !== 'EXCLUIR'}
              className="w-full h-12"
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir minha conta agora'}
            </Button>
          </section>
        )}

        <section className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">
              {isLoggedIn ? 'Ou solicitar via formulario' : 'Solicitar exclusao'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoggedIn
                ? 'Se preferir, registre um pedido por escrito (processado em ate 30 dias).'
                : 'Informe o email da sua conta Gamma. Processaremos em ate 30 dias e enviaremos confirmacao por email.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email da conta</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Conte por que esta excluindo (ajuda a Gamma a melhorar)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          <Button
            variant="outline"
            onClick={handleTicketRequest}
            disabled={isSubmitting || !email.trim()}
            className="w-full"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar pedido de exclusao'}
          </Button>
        </section>

        <section className="text-center text-sm text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Duvidas: <a href="mailto:contato@gamma.app.br" className="text-primary hover:underline">contato@gamma.app.br</a>
          </p>
          <p>
            <a href="/privacy" className="text-primary hover:underline">Politica de Privacidade</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default DeleteAccount;
