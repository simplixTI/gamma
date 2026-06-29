import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, Phone, User, Ship } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getBoatColor } from '@/utils/boatColors';

interface RideAcceptedModalProps {
  isOpen: boolean;
  onClose: () => void;
  pilotName: string;
  pilotRating?: number;
  pilotPhone?: string;
  pilotPhoto?: string;
  boatName?: string;
  boatColor?: string;
}

const RideAcceptedModal = ({
  isOpen,
  onClose,
  pilotName,
  pilotRating = 4.9,
  pilotPhone,
  pilotPhoto,
  boatName,
  boatColor,
}: RideAcceptedModalProps) => {
  const boatColorOption = getBoatColor(boatColor);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00BCD4', '#00ACC1', '#0097A7'],
      });
      
      // Animate content in
      setTimeout(() => setShowContent(true), 200);
      
      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div
          className={`bg-card rounded-2xl p-6 text-center transform transition-all duration-500 ${
            showContent ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* Success icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-4 animate-bounce">
            <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success-foreground" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Corrida Aceita!
          </h2>
          <p className="text-muted mb-6">
            Prepare-se para embarcar
          </p>

          {/* Pilot info card */}
          <div className="bg-muted/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              {pilotPhoto ? (
                <img
                  src={pilotPhoto}
                  alt={pilotName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-secondary/30"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    el.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div
                className={`w-14 h-14 rounded-full bg-secondary/20 items-center justify-center ${pilotPhoto ? 'hidden' : 'flex'}`}
              >
                <User className="w-7 h-7 text-secondary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-foreground text-lg truncate">{pilotName}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span className="text-sm text-muted">{pilotRating.toFixed(1)}</span>
                </div>
                {boatName && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Ship className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{boatName}</span>
                    {boatColorOption && (
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="text-muted-foreground/60">·</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-border"
                          style={{ backgroundColor: boatColorOption.hex }}
                          aria-label={`Cor ${boatColorOption.label}`}
                        />
                        <span>{boatColorOption.label}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              {pilotPhone && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => window.location.href = `tel:${pilotPhone}`}
                  className="rounded-full shrink-0"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-primary mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-medium">Piloto a caminho do embarque</span>
          </div>

          <Button onClick={onClose} fullWidth className="h-12">
            Ver no mapa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RideAcceptedModal;
