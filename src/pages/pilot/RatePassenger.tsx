import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StarRating from '@/components/StarRating';
import SimplixFooter from '@/components/SimplixFooter';

const RatePassenger = () => {
  const navigate = useNavigate();
  const { rideId } = useParams<{ rideId: string }>();
  const { user } = useAuthContext();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengerUserId, setPassengerUserId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState<string>('Passageiro');
  const [ridePrice, setRidePrice] = useState<number>(0);
  const [loadingRide, setLoadingRide] = useState(true);

  useEffect(() => {
    if (!rideId) return;
    supabase
      .from('rides')
      .select('passenger_user_id, passenger_name, price')
      .eq('id', rideId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPassengerUserId(data.passenger_user_id ?? null);
          setPassengerName(data.passenger_name || 'Passageiro');
          setRidePrice(Number(data.price));
        }
        setLoadingRide(false);
      });
  }, [rideId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Selecione uma avaliação');
      return;
    }
    if (!rideId || !user?.id || !passengerUserId) {
      toast.error('Dados da corrida indisponíveis');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ride_reviews')
        .insert({
          ride_id: rideId,
          reviewer_id: user.id,
          reviewee_id: passengerUserId,
          reviewer_role: 'pilot',
          stars: rating,
          comment: comment || null,
        });
      if (error) throw error;
      toast.success('Avaliação enviada!');
      navigate('/pilot');
    } catch (err) {
      console.error('Error submitting rating:', err);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => navigate('/pilot');

  if (loadingRide) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se passenger_user_id for null (corrida legada), pular avaliação via useEffect
  // para não chamar navigate() durante a fase de render
  useEffect(() => {
    if (!loadingRide && !passengerUserId) {
      navigate('/pilot', { replace: true });
    }
  }, [loadingRide, passengerUserId, navigate]);

  if (!loadingRide && !passengerUserId) return null;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center p-3 safe-area-inset">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-elevated p-5 animate-scale-in">
        {/* Success icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-success-foreground" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground text-center mb-1">
          Corrida concluída!
        </h1>
        <p className="text-3xl font-bold text-success text-center mb-1">
          + R$ {ridePrice.toFixed(2).replace('.', ',')}
        </p>
        <p className="text-sm text-muted text-center mb-5">
          Como foi {passengerName}?
        </p>

        {/* Stars */}
        <div className="mb-4">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-center text-sm text-muted mt-2">
              {rating === 5 ? 'Passageiro excelente!' : rating >= 4 ? 'Bom passageiro' : rating >= 3 ? 'OK' : 'Pode melhorar'}
            </p>
          )}
        </div>

        {/* Comment */}
        <textarea
          placeholder="Comentário opcional"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-background border border-border rounded-xl p-2.5 resize-none h-16 mb-4 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
        />

        <div className="space-y-2">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar avaliação'
            )}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-muted h-10 text-sm"
          >
            Pular
          </Button>
        </div>
      </div>
      <SimplixFooter />
    </div>
  );
};

export default RatePassenger;
