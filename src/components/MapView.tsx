import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MapViewProps {
  className?: string;
  showBoats?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ className, showBoats = true }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      ref={mapRef}
      className={cn(
        "relative w-full h-full bg-gradient-to-b from-secondary/10 to-secondary/5 overflow-hidden",
        className
      )}
    >
      {/* Simulated map background */}
      <div className="absolute inset-0 opacity-50">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="water" patternUnits="userSpaceOnUse" width="100" height="100">
              <path d="M0 50 Q25 40 50 50 T100 50" fill="none" stroke="hsl(195, 100%, 45%)" strokeWidth="0.5" opacity="0.3"/>
              <path d="M0 70 Q25 60 50 70 T100 70" fill="none" stroke="hsl(195, 100%, 45%)" strokeWidth="0.5" opacity="0.3"/>
              <path d="M0 30 Q25 20 50 30 T100 30" fill="none" stroke="hsl(195, 100%, 45%)" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#water)" />
        </svg>
      </div>

      {/* Island shape */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-48 bg-success/20 rounded-[40%] border-2 border-success/30" />

      {/* User location marker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          <div className="absolute inset-0 w-8 h-8 bg-secondary/30 rounded-full animate-ping" />
          <div className="w-8 h-8 bg-secondary rounded-full border-4 border-card shadow-elevated flex items-center justify-center">
            <div className="w-2 h-2 bg-secondary-foreground rounded-full" />
          </div>
        </div>
      </div>

      {/* Boat markers */}
      {showBoats && isLoaded && (
        <>
          <div className="absolute top-1/3 left-1/4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              <div className="absolute inset-0 w-10 h-10 -m-1 bg-secondary/20 rounded-full pulse-marker" />
              <div className="w-8 h-8 bg-card rounded-full shadow-soft flex items-center justify-center boat-float">
                <span className="text-sm">🚤</span>
              </div>
            </div>
          </div>
          <div className="absolute top-1/4 right-1/3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="relative">
              <div className="absolute inset-0 w-10 h-10 -m-1 bg-secondary/20 rounded-full pulse-marker" />
              <div className="w-8 h-8 bg-card rounded-full shadow-soft flex items-center justify-center boat-float" style={{ animationDelay: '0.5s' }}>
                <span className="text-sm">🚤</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-1/3 right-1/4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="relative">
              <div className="absolute inset-0 w-10 h-10 -m-1 bg-secondary/20 rounded-full pulse-marker" />
              <div className="w-8 h-8 bg-card rounded-full shadow-soft flex items-center justify-center boat-float" style={{ animationDelay: '1s' }}>
                <span className="text-sm">🚤</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pier markers */}
      {isLoaded && (
        <>
          <div className="absolute top-[40%] left-[30%] animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="w-6 h-6 bg-success rounded-lg shadow-soft flex items-center justify-center">
              <div className="w-2 h-2 bg-success-foreground rounded-sm" />
            </div>
          </div>
          <div className="absolute top-[60%] right-[35%] animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="w-6 h-6 bg-success rounded-lg shadow-soft flex items-center justify-center">
              <div className="w-2 h-2 bg-success-foreground rounded-sm" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MapView;
