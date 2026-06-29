import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useNearestDeck } from '@/hooks/useNearestDeck';
import { locations } from '@/data/mockData';

interface Props {
  onUseAsOrigin: (deck: typeof locations[0]) => void;
}

const fmtDistance = (m: number): string => {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

const NearestDeckCard = ({ onUseAsOrigin }: Props) => {
  const { deck, distanceMeters, status } = useNearestDeck(true);

  if (status === 'idle' || status === 'requesting') {
    return (
      <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">Detectando sua localização…</p>
      </div>
    );
  }

  if (status === 'denied' || status === 'unsupported' || status === 'error' || !deck) {
    return null;
  }

  return (
    <button
      onClick={() => onUseAsOrigin(deck)}
      className="w-full text-left bg-primary/8 border border-primary/25 rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-transform cursor-pointer"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
            Você está aqui
          </p>
          <p className="font-semibold text-foreground text-sm truncate flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            {deck.name}
            {distanceMeters !== null && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({fmtDistance(distanceMeters)})
              </span>
            )}
          </p>
          <p className="text-xs text-primary font-medium mt-1">Pedir corrida daqui →</p>
        </div>
      </div>
    </button>
  );
};

export default NearestDeckCard;
