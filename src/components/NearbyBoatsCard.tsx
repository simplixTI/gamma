import { Ship, Circle } from 'lucide-react';
import { usePilotLocations } from '@/hooks/usePilotLocations';
import { useNearestDeck, haversineMeters } from '@/hooks/useNearestDeck';

const fmtDistance = (m: number): string => {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

const NearbyBoatsCard = () => {
  const pilots = usePilotLocations(true);
  const { userCoords } = useNearestDeck(true);

  const onlineCount = pilots.length;

  const pilotsByDistance = userCoords
    ? pilots
        .map((p) => ({
          ...p,
          distance: haversineMeters(userCoords.lat, userCoords.lng, p.lat, p.lng),
        }))
        .sort((a, b) => a.distance - b.distance)
    : [];

  const nearest = pilotsByDistance[0];

  if (onlineCount === 0) {
    return (
      <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl px-4 py-3.5 flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0">
          <Ship className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Nenhum barco online agora</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tente novamente em alguns minutos ou procure outro transporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-10 h-10 bg-success/15 rounded-xl flex items-center justify-center shrink-0">
          <Ship className="w-5 h-5 text-success" />
          <Circle className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 fill-success text-success animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            {onlineCount} {onlineCount === 1 ? 'barco online' : 'barcos online'} agora
          </p>
          {nearest && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Mais próximo: {fmtDistance(nearest.distance)} de você
            </p>
          )}
          {!userCoords && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Ative a localização para ver a distância
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyBoatsCard;
