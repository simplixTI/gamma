import { useState, useEffect } from 'react';
import { Clock, Navigation, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ride } from '@/types';

interface RideRequestCardProps {
  ride: Ride;
  onAccept?: () => void;
  onReject?: () => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

const RideRequestCard: React.FC<RideRequestCardProps> = ({
  ride,
  onAccept,
  onReject,
  isAccepting = false,
  isRejecting = false,
}) => {
  const [timeAgo, setTimeAgo] = useState('agora');
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    // Pulse effect for new rides
    const timer = setTimeout(() => setIsNew(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const seconds = Math.floor((Date.now() - new Date(ride.createdAt).getTime()) / 1000);
      if (seconds < 60) setTimeAgo('agora');
      else if (seconds < 120) setTimeAgo('1 min');
      else setTimeAgo(`${Math.floor(seconds / 60)} min`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [ride.createdAt]);

  return (
    <div className={`bg-card rounded-xl shadow-md overflow-hidden transition-all duration-300 ${isNew ? 'ring-2 ring-success animate-pulse' : ''}`}>
      {/* Header with price highlight */}
      <div className="bg-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={ride.passengerPhoto}
              alt={ride.passengerName}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary-foreground"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-primary" />
          </div>
          <div>
            <p className="font-semibold text-primary-foreground">{ride.passengerName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-primary-foreground/70" />
              <p className="text-xs text-primary-foreground/70">
                {ride.passengerCount ?? 1} passageiro{(ride.passengerCount ?? 1) > 1 ? 's' : ''}
              </p>
              <span className="text-primary-foreground/40 mx-1">·</span>
              <p className="text-xs text-primary-foreground/60">{timeAgo}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-foreground">
            R${ride.price.toFixed(0)}
          </p>
          <p className="text-xs text-primary-foreground/60">total do grupo</p>
        </div>
      </div>

      {/* Route info */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Timeline dots */}
          <div className="flex flex-col items-center py-1">
            <div className="w-3 h-3 rounded-full bg-success" />
            <div className="w-0.5 flex-1 bg-border my-1" />
            <div className="w-3 h-3 rounded-full bg-foreground" />
          </div>

          {/* Location details */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium text-foreground text-sm">{ride.origin.name}</p>
              <p className="text-xs text-muted">{ride.origin.address}</p>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{ride.destination.name}</p>
              <p className="text-xs text-muted">{ride.destination.address}</p>
            </div>
          </div>

          {/* Trip stats */}
          <div className="flex flex-col items-end justify-between">
            <div className="flex items-center gap-1 text-muted">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{ride.estimatedTime} min</span>
            </div>
            <div className="flex items-center gap-1 text-muted">
              <Navigation className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{ride.distance} km</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isAccepting || isRejecting}
            className="flex-1 h-11"
          >
            {isRejecting ? 'Recusando...' : 'Recusar'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onAccept}
            disabled={isAccepting || isRejecting}
            className="flex-[2] h-11 bg-success hover:bg-success/90 text-success-foreground"
          >
            {isAccepting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-success-foreground border-t-transparent rounded-full animate-spin" />
                Aceitando...
              </span>
            ) : 'Aceitar Corrida'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RideRequestCard;