import { useState, useEffect } from 'react';
import { Star, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pilot } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface PilotCardProps {
  pilot: Pilot;
  arrivalTime?: number;
  distance?: number;
  onCall?: () => void;
  onMessage?: () => void;
}

const PilotCard: React.FC<PilotCardProps> = ({
  pilot,
  arrivalTime,
  distance,
  onCall,
  onMessage,
}) => {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    const fetchPilotRating = async () => {
      if (!pilot.id) return;
      
      const { data, error } = await supabase
        .from('rides')
        .select('rating')
        .eq('pilot_id', pilot.id)
        .not('rating', 'is', null);
      
      if (!error && data && data.length > 0) {
        const ratings = data.map(r => r.rating).filter(r => r !== null) as number[];
        if (ratings.length > 0) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          setAverageRating(Math.round(avg * 10) / 10);
          setTotalRatings(ratings.length);
        }
      }
    };
    
    fetchPilotRating();
  }, [pilot.id]);

  const displayRating = averageRating ?? pilot.rating;

  return (
    <div className="bg-card rounded-xl shadow-elevated p-3 space-y-3">
      <div className="flex items-center gap-3">
        <img
          src={pilot.photo}
          alt={pilot.name}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-secondary"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base text-foreground truncate">{pilot.name}</p>
          <p className="text-xs text-muted truncate">{pilot.boat}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-foreground">{displayRating}</span>
            {totalRatings > 0 && (
              <span className="text-xs text-muted">({totalRatings})</span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={onCall}
            className="rounded-full w-9 h-9"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onMessage}
            className="rounded-full w-9 h-9"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {(arrivalTime !== undefined || distance !== undefined) && (
        <div className="bg-secondary/10 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <p className="text-secondary font-bold text-lg">
              Chegando em {arrivalTime} min
            </p>
            {distance !== undefined && distance > 0 && (
              <p className="text-secondary/70 text-xs">
                {distance < 1 
                  ? `${Math.round(distance * 1000)} metros de distância`
                  : `${distance.toFixed(1)} km de distância`
                }
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center animate-pulse">
            <span className="text-xl">🚤</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PilotCard;
