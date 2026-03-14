import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RideWithPayment {
  id: string;
  origin_name: string;
  destination_name: string | null;
  price: number;
  status: string;
  created_at: string;
  payment_status: string | null;
}

const RecentRidesCard = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [rides, setRides] = useState<RideWithPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentRides = async () => {
      if (!user?.id) { setIsLoading(false); return; }
      
      // Fetch rides with payment status
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('id, origin_name, destination_name, price, status, created_at')
        .eq('passenger_user_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (ridesError) {
        console.error('Error fetching rides:', ridesError);
        setIsLoading(false);
        return;
      }

      if (!ridesData || ridesData.length === 0) {
        setRides([]);
        setIsLoading(false);
        return;
      }

      // Fetch payment status for each ride
      const rideIds = ridesData.map(r => r.id);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('ride_id, status')
        .in('ride_id', rideIds);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      }

      // Merge payment status with rides
      const ridesWithPayment = ridesData.map(ride => ({
        ...ride,
        payment_status: paymentsData?.find(p => p.ride_id === ride.id)?.status || null
      }));

      setRides(ridesWithPayment);
      setIsLoading(false);
    };

    fetchRecentRides();
  }, [user?.id]);

  const getPaymentBadge = (rideStatus: string, paymentStatus: string | null) => {
    if (rideStatus === 'cancelled') {
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="w-3.5 h-3.5" />
          Cancelada
        </span>
      );
    }
    
    if (paymentStatus === 'completed') {
      return (
        <span className="flex items-center gap-1 text-xs text-success">
          <CheckCircle className="w-3.5 h-3.5" />
          Pago
        </span>
      );
    }
    
    if (paymentStatus === 'pending') {
      return (
        <span className="flex items-center gap-1 text-xs text-warning">
          <AlertCircle className="w-3.5 h-3.5" />
          Pendente
        </span>
      );
    }
    
    // No payment record
    return (
      <span className="flex items-center gap-1 text-xs text-muted">
        <Clock className="w-3.5 h-3.5" />
        Aguardando
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-muted/20 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-muted/10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (rides.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">Viagens recentes</h3>
        <button 
          onClick={() => navigate('/passenger/history')}
          className="text-xs text-primary font-medium flex items-center gap-0.5"
        >
          Ver todas
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="divide-y divide-border">
        {rides.map((ride) => (
          <div 
            key={ride.id} 
            className="flex items-center gap-3 p-3 hover:bg-muted/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {ride.origin_name}
              </p>
              <p className="text-xs text-muted">
                {format(new Date(ride.created_at), "dd MMM, HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">R${Number(ride.price).toFixed(0)}</p>
              {getPaymentBadge(ride.status, ride.payment_status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentRidesCard;
