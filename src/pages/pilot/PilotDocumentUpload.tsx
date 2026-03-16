import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, CheckCircle, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DocType {
  type: string;
  label: string;
  description: string;
  accept: string;
}

const DOC_TYPES: DocType[] = [
  { type: 'rg_front', label: 'RG — Frente', description: 'Foto da frente do RG (legível, sem reflexo)', accept: 'image/*,.pdf' },
  { type: 'rg_back', label: 'RG — Verso', description: 'Foto do verso do RG', accept: 'image/*,.pdf' },
  { type: 'cnh', label: 'CNH', description: 'Carteira de Habilitação válida', accept: 'image/*,.pdf' },
  { type: 'carta_nautica', label: 'Carta Náutica', description: 'Habilitação náutica / HABNA', accept: 'image/*,.pdf' },
  { type: 'boat_registration', label: 'Documentação do Barco', description: 'DPC / TIE ou documento equivalente', accept: 'image/*,.pdf' },
  { type: 'proof_of_residence', label: 'Comprovante de Residência', description: 'Conta de luz/água/gás dos últimos 3 meses', accept: 'image/*,.pdf' },
  { type: 'selfie', label: 'Selfie com Documento', description: 'Foto sua segurando o RG ou CNH', accept: 'image/*' },
];

interface UploadedDoc {
  document_type: string;
  status: string;
}

const PilotDocumentUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [pilotId, setPilotId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string>('pending');

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('pilot_profiles')
      .select('id, approval_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) { navigate('/pilot', { replace: true }); return; }
    setPilotId(profile.id);
    setApprovalStatus(profile.approval_status ?? 'pending');

    const { data: docs } = await supabase
      .from('pilot_documents')
      .select('document_type, status')
      .eq('pilot_id', profile.id);
    setUploaded(docs ?? []);
  }, [user, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const uploadDoc = async (type: string, file: File) => {
    if (!pilotId || !user) return;

    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_MB}MB.`);
      return;
    }

    setUploading(type);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${type}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from('pilot-documents')
        .upload(path, file, { upsert: true });

      if (storageErr) throw storageErr;

      const { error: dbErr } = await supabase
        .from('pilot_documents')
        .upsert({
          pilot_id: pilotId,
          user_id: user.id,
          document_type: type,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          status: 'pending',
          uploaded_at: new Date().toISOString(),
        }, { onConflict: 'pilot_id,document_type' });

      if (dbErr) throw dbErr;

      toast.success('Documento enviado!');
      await loadData();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDoc(type, file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!pilotId) return;
    const allUploaded = DOC_TYPES.every(d => uploaded.some(u => u.document_type === d.type));
    if (!allUploaded) {
      toast.error('Envie todos os documentos antes de submeter');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('pilot_profiles')
        .update({
          approval_status: 'under_review',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', pilotId);

      if (error) throw error;
      toast.success('Documentos enviados para análise! Em até 24h você receberá uma resposta.');
      setApprovalStatus('under_review');
    } catch {
      toast.error('Erro ao submeter documentos');
    } finally {
      setSubmitting(false);
    }
  };

  const getDocStatus = (type: string) => uploaded.find(u => u.document_type === type);
  const allUploaded = DOC_TYPES.every(d => uploaded.some(u => u.document_type === d.type));

  if (approvalStatus === 'approved') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Conta aprovada!</h1>
        <p className="text-muted-foreground mt-2 mb-6">Sua conta foi aprovada. Você já pode receber corridas.</p>
        <Button onClick={() => navigate('/pilot')}>Ir ao painel</Button>
      </div>
    );
  }

  if (approvalStatus === 'under_review') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Em análise</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          Seus documentos estão sendo analisados. Em até 24 horas você receberá uma resposta por e-mail.
        </p>
        <Button variant="outline" onClick={() => navigate('/pilot')}>Voltar ao painel</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pilot')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Documentação do piloto</h1>
            <p className="text-xs text-muted-foreground">{uploaded.length}/{DOC_TYPES.length} documentos enviados</p>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto pb-8 space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Envie todos os documentos abaixo</p>
          Após envio, nossa equipe analisará em até 24 horas. Fotos devem ser nítidas e legíveis.
        </div>

        {DOC_TYPES.map(({ type, label, description, accept }) => {
          const doc = getDocStatus(type);
          const isUploading = uploading === type;

          return (
            <div
              key={type}
              className={`bg-card rounded-xl border p-4 flex items-center gap-3 transition-colors
                ${doc ? 'border-green-500/40' : 'border-border'}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                ${doc ? 'bg-green-500/10' : 'bg-muted'}`}>
                {doc ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>

              <label className="shrink-0">
                <input
                  type="file"
                  accept={accept}
                  onChange={handleFileChange(type)}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  variant={doc ? 'ghost' : 'outline'}
                  size="sm"
                  className={doc ? 'text-muted-foreground' : ''}
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="ml-1.5">{doc ? 'Trocar' : 'Enviar'}</span>
                  </span>
                </Button>
              </label>
            </div>
          );
        })}

        <div className="pt-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!allUploaded || submitting}
          >
            {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
            Enviar para análise
          </Button>
          {!allUploaded && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Faltam {DOC_TYPES.length - uploaded.length} documento(s)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PilotDocumentUpload;
