import { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Navigation, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Location } from '@/types';
import { locations } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import type { PilotLocation } from '@/hooks/usePilotLocations';
import { buildWaterRoute, buildPilotRoute } from '@/data/canalWaypoints';

const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry' | 'routes')[] = ['places', 'geometry', 'routes'];

export interface RouteSegmentInfo {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteInfo {
  pilotToOrigin: RouteSegmentInfo;
  originToDestination: RouteSegmentInfo;
}

interface GoogleMapViewProps {
  className?: string;
  showBoats?: boolean;
  onLocationSelect?: (location: Location) => void;
  selectedLocation?: Location | null;
  showRoute?: boolean;
  origin?: Location | null;
  destination?: Location | null;
  pilotPosition?: { lat: number; lng: number } | null;
  pilotPositions?: PilotLocation[];
  animateBoatOnRoute?: boolean;
  zoom?: number;
  onRouteInfo?: (info: RouteInfo) => void;
  routePhase?: 'preview' | 'tracking';
  rideInProgress?: boolean;
}

// Centro calculado a partir dos 24 pontos reais de embarque/desembarque
const GIGOIA_CENTER = {
  lat: -23.0030,
  lng: -43.3107,
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const GIGOIA_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Hide ALL POI geometry (commercial pins, attraction icons, etc.)
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  // Explicitly hide poi.business (main "ad-like" business pins)
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  // Hide all POI text labels
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // Hide POI pin icons (belt-and-suspenders with the rules above)
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Hide transit lines and station icons
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Deep navy water — Uber-like dark ocean tone
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17497a' }] },
  // Subtle water label color (pier names, water body names)
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7fa5' }] },
  // Off-white land (clean, high contrast against navy water)
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2ef' }] },
  // White roads
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  // Simplified road labels (keep street names, remove clutter)
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  // Hide road shield icons (route numbers, highway badges)
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Subtle admin borders
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c0c0c0' }, { weight: 0.8 }] },
  // Muted admin labels (city/neighborhood names)
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: GIGOIA_MAP_STYLES,
};

// Boat positions de fallback — barcos nos canais reais ao redor da Ilha de Gigoia
const boatPositions = [
  { id: 1, lat: -23.0028, lng: -43.3095 }, // canal central Gigoia
  { id: 2, lat: -23.0015, lng: -43.3082 }, // canal norte (→ Caiçaras / Ilha Primeira)
  { id: 3, lat: -23.0045, lng: -43.3115 }, // canal oeste (→ Condado / Downtown)
];

const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  className,
  showBoats = true,
  onLocationSelect,
  selectedLocation,
  showRoute = false,
  origin,
  destination,
  pilotPosition,
  pilotPositions,
  animateBoatOnRoute = false,
  zoom = 15,
  onRouteInfo,
  routePhase = 'tracking',
  rideInProgress = false,
}) => {
  const [apiKey] = useState<string>(import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '');
  const [selectedMarker, setSelectedMarker] = useState<Location | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pilotToOriginPath, setPilotToOriginPath] = useState<google.maps.LatLngLiteral[] | null>(null);
  const [originToDestPath, setOriginToDestPath] = useState<google.maps.LatLngLiteral[] | null>(null);

  const pilotMarkerRef = useRef<google.maps.Marker | null>(null);
  const prevPilotPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPilotKey = useRef<string>("");
  const lastRouteKey = useRef<string>("");
  const pilotSegmentRef = useRef<RouteSegmentInfo | null>(null);
  const destSegmentRef = useRef<RouteSegmentInfo | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'google-map-script',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserLocation(GIGOIA_CENTER);
        }
      );
    } else {
      setUserLocation(GIGOIA_CENTER);
    }
  }, []);

  // Rota pela água: piloto -> embarque (via canal)
  useEffect(() => {
    if (!isLoaded || !pilotPosition || !origin?.coordinates?.length) return;
    const key = pilotPosition.lat.toFixed(5) + "," + pilotPosition.lng.toFixed(5) + "|" + origin.coordinates[1].toFixed(5) + "," + origin.coordinates[0].toFixed(5);
    if (key === lastPilotKey.current) return;
    lastPilotKey.current = key;
    const fromPt = { lat: pilotPosition.lat, lng: pilotPosition.lng };
    const toPt = { lat: origin.coordinates[1], lng: origin.coordinates[0] };
    const path = buildPilotRoute(fromPt, origin.id, toPt);
    setPilotToOriginPath(path);
    // Distância acumulada ao longo dos waypoints
    let totalMeters = 0;
    for (let i = 1; i < path.length; i++) {
      totalMeters += google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(path[i - 1].lat, path[i - 1].lng),
        new google.maps.LatLng(path[i].lat, path[i].lng),
      );
    }
    const durationSeconds = Math.round((totalMeters / (20 * 1000 / 3600)) + 60);
    pilotSegmentRef.current = { distanceMeters: Math.round(totalMeters), durationSeconds };
    if (destSegmentRef.current && onRouteInfo) {
      onRouteInfo({ pilotToOrigin: pilotSegmentRef.current, originToDestination: destSegmentRef.current });
    }
  }, [isLoaded, pilotPosition, origin, onRouteInfo]);

  // Rota pela água: embarque -> destino (via canal)
  useEffect(() => {
    if (!isLoaded || !origin?.coordinates?.length || !destination?.coordinates?.length) return;
    const key = origin.coordinates[1].toFixed(5) + "," + origin.coordinates[0].toFixed(5) + "|" + destination.coordinates[1].toFixed(5) + "," + destination.coordinates[0].toFixed(5);
    if (key === lastRouteKey.current) return;
    lastRouteKey.current = key;
    const fromPt = { lat: origin.coordinates[1], lng: origin.coordinates[0] };
    const toPt = { lat: destination.coordinates[1], lng: destination.coordinates[0] };
    const path = buildWaterRoute(fromPt, origin.id, toPt, destination.id);
    setOriginToDestPath(path);
    let totalMeters = 0;
    for (let i = 1; i < path.length; i++) {
      totalMeters += google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(path[i - 1].lat, path[i - 1].lng),
        new google.maps.LatLng(path[i].lat, path[i].lng),
      );
    }
    const durationSeconds = Math.round((totalMeters / (20 * 1000 / 3600)) + 60);
    destSegmentRef.current = { distanceMeters: Math.round(totalMeters), durationSeconds };
    if (pilotSegmentRef.current && onRouteInfo) {
      onRouteInfo({ pilotToOrigin: pilotSegmentRef.current, originToDestination: destSegmentRef.current });
    } else if (onRouteInfo) {
      onRouteInfo({ pilotToOrigin: { distanceMeters: 0, durationSeconds: 0 }, originToDestination: destSegmentRef.current });
    }
  }, [isLoaded, origin, destination, onRouteInfo]);

  // Auto-fit map to show origin + destination + pilot when route is set
  useEffect(() => {
    if (!map || !origin?.coordinates?.length || !destination?.coordinates?.length) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: origin.coordinates[1], lng: origin.coordinates[0] });
    bounds.extend({ lat: destination.coordinates[1], lng: destination.coordinates[0] });
    if (pilotPosition) bounds.extend(pilotPosition);
    map.fitBounds(bounds, { top: 80, right: 24, bottom: 220, left: 24 });
  }, [map, origin, destination, pilotPosition]);

  // Smooth pilot marker animation — interpolate position over 500ms to avoid GPS teleport
  useEffect(() => {
    // Always clear previous interval first to prevent queuing
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (!pilotPosition || !map || !prevPilotPositionRef.current) {
      // Just update the marker directly without animation
      if (pilotMarkerRef.current && pilotPosition) {
        pilotMarkerRef.current.setPosition(pilotPosition);
      }
      prevPilotPositionRef.current = pilotPosition;
      return;
    }

    const prev = prevPilotPositionRef.current;
    const from = { lat: prev.lat, lng: prev.lng };
    const to = { lat: pilotPosition.lat, lng: pilotPosition.lng };

    const STEPS = 20;
    const DURATION_MS = 500;
    let step = 0;

    animationIntervalRef.current = setInterval(() => {
      step++;
      const t = step / STEPS;
      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;
      pilotMarkerRef.current?.setPosition({ lat, lng });
      if (step >= STEPS) {
        clearInterval(animationIntervalRef.current!);
        animationIntervalRef.current = null;
        prevPilotPositionRef.current = to;
      }
    }, DURATION_MS / STEPS);

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [pilotPosition, map]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = useCallback((location: Location) => {
    setSelectedMarker(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  }, [onLocationSelect]);

  if (apiKey === '') {
    return (
      <div className={cn("relative w-full h-full bg-destructive/5 flex items-center justify-center p-4", className)}>
        <div className="bg-card rounded-2xl shadow-elevated p-4 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2 text-sm">Chave do Google Maps não configurada</h3>
          <p className="text-xs text-muted mb-3">
            Configure VITE_GOOGLE_MAPS_KEY no arquivo .env
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn("relative w-full h-full bg-destructive/5 flex items-center justify-center p-4", className)}>
        <div className="bg-card rounded-2xl shadow-elevated p-4 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2 text-sm">Erro ao carregar o mapa</h3>
          <p className="text-xs text-muted mb-3">
            Verifique sua conexão com a internet.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.history.go(0); }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("relative w-full h-full bg-secondary/5 flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full touch-pan-x touch-pan-y", className)}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={GIGOIA_CENTER}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#00A8E8',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            zIndex={10}
          />
        )}

        {/* Pier/Location markers — origem laranja, destino preto, resto verde */}
        {locations.map((location) => {
          const isOrigin = origin?.id === location.id;
          const isDestination = destination?.id === location.id;
          const isSelected = selectedLocation?.id === location.id;
          const fillColor = isOrigin
            ? '#F97316'                  // laranja pra embarque
            : isDestination
              ? '#111827'                // preto pra destino
              : isSelected
                ? '#00A8E8'              // cyan em selecao pontual
                : '#10B981';             // verde padrao (deck disponivel)
          const scale = isOrigin || isDestination ? 1.7 : 1.3;
          const zIndex = isOrigin || isDestination ? 20 : 1;
          return (
            <Marker
              key={location.id}
              position={{
                lat: location.coordinates[1],
                lng: location.coordinates[0],
              }}
              onClick={() => handleMarkerClick(location)}
              zIndex={zIndex}
              icon={{
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                fillColor,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: isOrigin || isDestination ? 3 : 2,
                scale,
                anchor: new google.maps.Point(12, 22),
              }}
            />
          );
        })}

        {/* Boat markers — real pilots from locations table, or fallback to hardcoded */}
        {showBoats && (pilotPositions ?? boatPositions.map((b) => ({ pilot_id: String(b.id), lat: b.lat, lng: b.lng, is_available: true }))).map((pilot) => (
          <Marker
            key={'pilot_id' in pilot ? pilot.pilot_id : (pilot as typeof boatPositions[0]).id}
            position={{ lat: pilot.lat, lng: pilot.lng }}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="white" stroke="#00A8E8" stroke-width="2"/>
                  <text x="18" y="24" text-anchor="middle" font-size="18">🚤</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(36, 36),
            }}
            zIndex={5}
          />
        ))}

        {/* Rota pela água: piloto -> embarque */}
        {pilotToOriginPath && routePhase === 'tracking' && (
          <Polyline
            path={pilotToOriginPath}
            options={{ strokeColor: "#00A8E8", strokeOpacity: 0.9, strokeWeight: 5, zIndex: 8, icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 3, strokeColor: '#ffffff', strokeWeight: 1 }, offset: '50%' }] }}
          />
        )}

        {/* Rota pela água: embarque -> destino
            Preview (antes da corrida): NAO renderiza — o roteamento por canais eh
            aproximado e as retas entre waypoints acabavam cortando terra em alguns
            trajetos. Durante 'tracking' (corrida ativa) mantemos a linha verde
            porque a viagem ja esta acontecendo e o polyline sinaliza direcao geral.
            O calculo de ETA/distancia via buildWaterRoute continua rodando no
            useEffect e sendo emitido via onRouteInfo. */}
        {originToDestPath && routePhase !== 'preview' && (
          <Polyline
            path={originToDestPath}
            options={{
              strokeColor: '#22C55E',
              strokeOpacity: 0.85,
              strokeWeight: 5,
              zIndex: 7,
              icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 3, strokeColor: '#ffffff', strokeWeight: 1 }, offset: '50%' }],
            }}
          />
        )}

        {/* Pilot position marker — barquinho animado */}
        {pilotPosition && (
          <Marker
            position={pilotPosition}
            onLoad={(marker) => { pilotMarkerRef.current = marker; }}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="20" fill="white" stroke="${rideInProgress ? '#22C55E' : '#00A8E8'}" stroke-width="3"/>
                  <text x="22" y="30" text-anchor="middle" font-size="22">🚤</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(44, 44),
              anchor: new google.maps.Point(22, 22),
            }}
            zIndex={15}
          />
        )}

        {/* Info Window for selected marker */}
        {selectedMarker && (
          <InfoWindow
            position={{
              lat: selectedMarker.coordinates[1],
              lng: selectedMarker.coordinates[0],
            }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1.5 min-w-[120px]">
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">{selectedMarker.name}</h3>
              <p className="text-xs text-gray-600 mb-1">{selectedMarker.address}</p>
              <p className="text-xs text-cyan-600 font-medium">{selectedMarker.estimatedTime}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Center on user button - mobile optimized */}
      {userLocation && (
        <button
          onClick={() => {
            if (map) {
              map.panTo(userLocation);
              map.setZoom(16);
            }
          }}
          className="absolute bottom-20 right-3 w-11 h-11 bg-card rounded-full shadow-elevated flex items-center justify-center active:scale-95 transition-transform z-10"
        >
          <Navigation className="w-5 h-5 text-secondary" />
        </button>
      )}
    </div>
  );
};

export default GoogleMapView;
