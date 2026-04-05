import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Eye, ChevronDown, ChevronUp, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PilotWithDocs {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  boat_type: string | null;
  boat_identification: string | null;
  approval_status: string;
  submitted_at: string | null;
  approval_notes: string | null;
  pilot_documents: Array<{
    id: string;
    document_type: string;
    storage_path: string;
    status: string;
  }>;
}

const DOC_LABELS: Record<string, string> = {
  rg_front: 'RG (Frente)',
  rg_back: 'RG (Verso)',
  cnh: 'CNH',
  carta_nautica: 'Carta Náutica',
  boat_registration: 'Documentação do Barco',
  proof_of_residence: 'Comprovante de Residência',
  selfie: 'Selfie com Documento',
};

const REQUIRED_DOCS = Object.keys(DOC_LABELS);

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  under_review: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  approved: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const statusLabel: Record<string, string> = {
  pending: 'Aguardando documentos',
  under_review: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Reprovado',
};

const AdminPilotApproval = () => {
  const [pilots, setPilots] = useState<PilotWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('under_review');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pilot_profiles')
      .select(`id, user_id, full_name, email, phone, cpf, boat_type, boat_identification,
        approval_status, submitted_at, approval_notes,
        pilot_documents(id, document_type, storage_path, status)`)
      .order('submitted_at', { ascending: true, nullsFirst: false });
    setPilots(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getDocUrl = async (path: string) => {
    if (docUrls[path]) return docUrls[path];
    const { data } = await supabase.storage
      .from('pilot-documents')
      .createSignedUrl(path, 300);
    if (data?.signedUrl) {
      setDocUrls(prev => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  const openDoc = async (path: string) => {
    const url = await getDocUrl(path);
    if (url) window.open(url, '_blank', 'noopener');
    else toast.error('Erro ao abrir documento');
  };

  const setStatus = async (pilotId: string, status: 'under_review' | 'approved' | 'rejected') => {
    setActionLoading(pilotId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('pilot_profiles')
        .update({
          approval_status: status,
          approval_notes: notes[pilotId] ?? null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          // When approved, also set is_verified = true
          ...(status === 'approved' ? { is_verified: true, is_active: true } : {}),
          ...(status === 'rejected' ? { is_verified: false, is_active: false } : {}),
        })
        .eq('id', pilotId);

      if (error) throw error;
      toast.success(
        status === 'approved' ? 'Piloto aprovado!' :
        status === 'rejected' ? 'Piloto reprovado' : 'Status atualizado'
      );
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Erro ao atualizar status do piloto. Tente novamente.');

      // Notify pilot via push notification (fire-and-forget — don't block UI)
      const pilot = pilots.find(p => p.id === pilotId);
      if (pilot?.user_id && (status === 'approved' || status === 'rejected')) {
        const noteText = notes[pilotId] ?? pilot.approval_notes ?? '';
        const pushTitle = status === 'approved' ? 'Conta aprovada! 🎉' : 'Documentação reprovada';
        const pushBody = status === 'approved'
          ? 'Sua conta foi aprovada. Você já pode receber corridas na Gamma!'
          : noteText
            ? `Reprovado: ${noteText}. Corrija e reenvie.`
            : 'Sua documentação foi reprovada. Acesse o app para ver detalhes.';
        void supabase.functions.invoke('send-push-notification', {
          body: { userId: pilot.user_id, title: pushTitle, body: pushBody },
        });
      }

      await load();
      setExpanded(null);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = pilots.filter(p =>
    activeFilter === 'all' || p.approval_status === activeFilter
  );

  const counts = {
    all: pilots.length,
    pending: pilots.filter(p => p.approval_status === 'pending').length,
    under_review: pilots.filter(p => p.approval_status === 'under_review').length,
    approved: pilots.filter(p => p.approval_status === 'approved').length,
    rejected: pilots.filter(p => p.approval_status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aprovação de Pilotos</h1>
        <p className="text-sm text-muted-foreground">Revise documentos e aprove ou reprove cadastros em até 24h</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['under_review', 'pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
              ${activeFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}
          >
            {f === 'all' ? 'Todos' : statusLabel[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum piloto neste status
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pilot => {
            const isExpanded = expanded === pilot.id;
            const hasAllDocs = REQUIRED_DOCS.every(type =>
              pilot.pilot_documents.some(d => d.document_type === type)
            );

            return (
              <div key={pilot.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <div
                  className="px-4 py-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : pilot.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{pilot.full_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor[pilot.approval_status] ?? ''}`}>
                        {statusLabel[pilot.approval_status] ?? pilot.approval_status}
                      </span>
                      {!hasAllDocs && pilot.approval_status !== 'rejected' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-600 border-orange-500/30">
                          Docs incompletos
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {pilot.email} · {pilot.phone}
                      {pilot.submitted_at && ` · Enviado ${new Date(pilot.submitted_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border space-y-4 pt-4">
                    {/* Pilot info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-muted-foreground">CPF</p><p className="font-medium">{pilot.cpf}</p></div>
                      <div><p className="text-muted-foreground">Tipo de barco</p><p className="font-medium">{pilot.boat_type ?? '—'}</p></div>
                      <div><p className="text-muted-foreground">ID embarcação</p><p className="font-medium">{pilot.boat_identification ?? '—'}</p></div>
                    </div>

                    {/* Documents */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Documentos</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {REQUIRED_DOCS.map(type => {
                          const doc = pilot.pilot_documents.find(d => d.document_type === type);
                          return (
                            <div
                              key={type}
                              className={`rounded-lg border p-3 text-sm
                                ${doc ? 'border-border bg-muted/20 cursor-pointer hover:bg-muted/40' : 'border-dashed border-border bg-muted/10 opacity-50'}`}
                              onClick={() => doc && openDoc(doc.storage_path)}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-xs font-medium text-foreground truncate">{DOC_LABELS[type]}</span>
                              </div>
                              <p className={`text-xs mt-1 ${doc ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {doc ? '✓ Enviado' : 'Não enviado'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    {pilot.approval_status !== 'approved' && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">Observações (opcional)</p>
                        <Textarea
                          placeholder="Ex: CNH vencida, foto ilegível, etc."
                          value={notes[pilot.id] ?? pilot.approval_notes ?? ''}
                          onChange={e => setNotes(prev => ({ ...prev, [pilot.id]: e.target.value }))}
                          className="text-sm resize-none"
                          rows={2}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {pilot.approval_status !== 'approved' && (
                      <div className="flex flex-wrap gap-2">
                        {pilot.approval_status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatus(pilot.id, 'under_review')}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === pilot.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                            Iniciar análise
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => setStatus(pilot.id, 'approved')}
                          disabled={!!actionLoading || !hasAllDocs}
                          title={!hasAllDocs ? 'Piloto precisa enviar todos os documentos' : undefined}
                        >
                          {actionLoading === pilot.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setStatus(pilot.id, 'rejected')}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === pilot.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                          Reprovar
                        </Button>
                      </div>
                    )}

                    {pilot.approval_status === 'approved' && (
                      <p className="text-sm text-green-600 font-medium">✓ Piloto aprovado e ativo na plataforma</p>
                    )}

                    {pilot.approval_notes && pilot.approval_status === 'rejected' && (
                      <div className="bg-destructive/10 rounded-lg p-3 text-sm text-destructive">
                        <span className="font-medium">Motivo da reprovação: </span>{pilot.approval_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPilotApproval;
