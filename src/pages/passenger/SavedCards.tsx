import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Trash2, Plus, Star, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import SimplixFooter from '@/components/SimplixFooter';

export interface SavedCard {
  id: string;
  user_id: string;
  last_four: string;
  brand: string;
  holder_name: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
  created_at: string;
  // Mercado Pago Customers API identifiers — present when card was saved via MP
  mp_customer_id?: string | null;
  mp_card_id?: string | null;
}

const brandColors: Record<string, string> = {
  visa: 'bg-blue-600',
  mastercard: 'bg-red-600',
  elo: 'bg-yellow-500',
  amex: 'bg-green-600',
  hipercard: 'bg-red-700',
};

const brandLabel: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'Amex',
  hipercard: 'Hipercard',
  debit_card: 'Débito',
};

export function getCardBrandIcon(brand: string) {
  return brandLabel[brand] || brand;
}

const SavedCards = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setCards(data as SavedCard[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleDelete = async (cardId: string) => {
    if (!user?.id) return;
    setDeletingId(cardId);

    const card = cards.find((c) => c.id === cardId);

    // If the card has an MP Customers token, remove it from MP first
    if (card?.mp_customer_id && card?.mp_card_id) {
      try {
        await supabase.functions.invoke('mp-delete-card', {
          body: { customerId: card.mp_customer_id, cardId: card.mp_card_id },
        });
      } catch (mpErr) {
        // Non-blocking: log and continue — local record will still be removed
        console.error('[SavedCards] MP card deletion failed:', mpErr);
      }
    }

    const { error } = await supabase
      .from('saved_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao remover cartão');
    } else {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      toast.success('Cartão removido');
    }
    setDeletingId(null);
  };

  const handleSetDefault = async (cardId: string) => {
    if (!user?.id) return;
    setSettingDefaultId(cardId);

    // Use RPC for atomic single-statement update to avoid race between two writes
    const { error } = await supabase.rpc('set_default_card', {
      p_user_id: user.id,
      p_card_id: cardId,
    });

    if (error) {
      // Fallback: two-step update if RPC not available
      await supabase.from('saved_cards').update({ is_default: false }).eq('user_id', user.id);
      const { error: e2 } = await supabase
        .from('saved_cards').update({ is_default: true }).eq('id', cardId).eq('user_id', user.id);
      if (e2) {
        toast.error('Erro ao definir cartão padrão');
        setSettingDefaultId(null);
        return;
      }
    }

    setCards((prev) => prev.map((c) => ({ ...c, is_default: c.id === cardId })));
    toast.success('Cartão padrão atualizado');
    setSettingDefaultId(null);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border safe-area-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Cartões salvos</h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Security note */}
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
          <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Seus dados são tokenizados e processados com segurança pelo Mercado Pago. O número completo nunca é armazenado.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Nenhum cartão salvo</p>
            <p className="text-sm text-muted-foreground">
              Ao pagar com cartão, você pode optar por salvá-lo para usar nas próximas corridas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`bg-card rounded-2xl border p-4 transition-all ${
                  card.is_default ? 'border-primary shadow-sm' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Brand badge */}
                  <div
                    className={`w-12 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      brandColors[card.brand] || 'bg-muted-foreground'
                    }`}
                  >
                    {getCardBrandIcon(card.brand)}
                  </div>

                  {/* Card info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm">
                        •••• {card.last_four}
                      </p>
                      {card.is_default && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          PADRÃO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {card.holder_name} · {card.expiry_month}/{card.expiry_year}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!card.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleSetDefault(card.id)}
                        disabled={settingDefaultId === card.id}
                        title="Definir como padrão"
                      >
                        {settingDefaultId === card.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Star className="w-4 h-4" />}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          disabled={deletingId === card.id}
                          title="Remover cartão"
                        >
                          {deletingId === card.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover cartão?</AlertDialogTitle>
                          <AlertDialogDescription>
                            •••• {card.last_four} será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(card.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add card hint */}
        <div className="bg-muted/5 border border-dashed border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-muted/10 rounded-xl flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Adicionar novo cartão</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pague uma corrida com cartão e marque "Salvar cartão" para adicioná-lo aqui.
            </p>
          </div>
        </div>
      </div>

      <SimplixFooter />
    </div>
  );
};

export default SavedCards;
