import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SearchingOverlayProps {
  onCancel: () => void;
}

const SearchingOverlay: React.FC<SearchingOverlayProps> = ({ onCancel }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="fixed inset-0 bg-card/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
      <div className="relative mb-8">
        {/* Animated waves */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-secondary/30 animate-ping" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-secondary/50 animate-ping animation-delay-200" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-secondary/70 animate-ping animation-delay-400" />
        </div>
        
        {/* Center boat icon */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center shadow-elevated">
            <svg className="w-10 h-10 text-secondary-foreground boat-float" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.57-.57a9.9 9.9 0 007.86 0C16.55 22.8 17.75 23 19 23h3v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.79l-1.2-2.4C20.4 8.51 20 7.77 20 7V6c0-1.1-.9-2-2-2h-1V1h-2v3H9V1H7v3H6C4.9 4 4 4.9 4 6v1c0 .77-.4 1.51-.63 2.13l-1.2 2.4a1 1 0 00-.06.79L3.95 19z"/>
            </svg>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
        Procurando pilotos próximos...
      </h2>
      <p className="text-muted text-center mb-2">
        Isso geralmente leva menos de 1 minuto
      </p>
      <p className="text-sm font-semibold text-secondary mb-6">
        {formatElapsed(elapsed)}
      </p>

      <Button
        variant="ghost"
        onClick={onCancel}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <X className="w-5 h-5 mr-2" />
        Cancelar solicitação
      </Button>
    </div>
  );
};

export default SearchingOverlay;
