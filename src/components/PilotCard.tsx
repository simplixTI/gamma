import { useState, useEffect } from 'react';
import { Star, Phone, MessageCircle, Navigation } from 'lucide-react';
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
    <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>

      {/* ETA strip — mostrado quando o piloto está a caminho */}
      {(arrivalTime !== undefined || distance !== undefined) && (
        <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary-foreground animate-pulse" />
            <p className="text-primary-foreground font-bold text-base">
              Chegando em {arrivalTime} min
            </p>
          </div>
          {distance !== undefined && distance > 0 && (
            <p className="text-primary-foreground/80 text-xs font-medium">
              {distance < 1
                ? `${Math.round(distance * 1000)} m`
                : `${distance.toFixed(1)} km`}
            </p>
          )}
        </div>
      )}

      {/* Pilot info row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Photo */}
        <div className="relative shrink-0">
          <img
            src={pilot.photo}
            alt={pilot.name}
            className="w-12 h-12 rounded-full object-cover"
            style={{ boxShadow: '0 0 0 2px hsl(var(--primary) / 0.3)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
        </div>

        {/* Name + boat + rating */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-base leading-tight truncate">{pilot.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{pilot.boat}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold text-foreground">{displayRating}</span>
            {totalRatings > 0 && (
              <span className="text-xs text-muted-foreground">({totalRatings} avaliações)</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={onCall}
            className="rounded-full w-10 h-10 border-primary/30 hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
          >
            <Phone className="w-4 h-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onMessage}
            className="rounded-full w-10 h-10 border-success/30 hover:bg-success/10 hover:border-success/50 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-success" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PilotCard;
