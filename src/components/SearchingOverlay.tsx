import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SearchingOverlayProps {
  onCancel: () => void;
}

const SearchingOverlay: React.FC<SearchingOverlayProps> = ({ onCancel }) => {
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
            <span className="text-4xl boat-float">🚤</span>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
        Procurando pilotos próximos...
      </h2>
      <p className="text-muted text-center mb-8">
        Isso geralmente leva menos de 1 minuto
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
