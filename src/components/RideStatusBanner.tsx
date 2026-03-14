import { CheckCircle, Clock, MapPin, Navigation, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RidePhase = 'searching' | 'accepted' | 'pilot_arriving' | 'in_progress' | 'completed';

interface RideStatusBannerProps {
  phase: RidePhase;
  pilotName?: string;
  className?: string;
}

const phaseConfig = {
  searching: {
    icon: Clock,
    label: 'Procurando piloto',
    description: 'Aguardando um piloto aceitar sua corrida',
    color: 'bg-secondary',
    textColor: 'text-secondary-foreground',
    animate: true,
  },
  accepted: {
    icon: CheckCircle,
    label: 'Piloto aceitou!',
    description: 'Seu piloto está a caminho',
    color: 'bg-success',
    textColor: 'text-success-foreground',
    animate: false,
  },
  pilot_arriving: {
    icon: MapPin,
    label: 'Piloto chegou!',
    description: 'Dirija-se ao ponto de embarque',
    color: 'bg-primary',
    textColor: 'text-primary-foreground',
    animate: true,
  },
  in_progress: {
    icon: Navigation,
    label: 'Em viagem',
    description: 'Navegando para o destino',
    color: 'bg-primary',
    textColor: 'text-primary-foreground',
    animate: false,
  },
  completed: {
    icon: CheckCircle,
    label: 'Viagem concluída',
    description: 'Obrigado por viajar conosco!',
    color: 'bg-success',
    textColor: 'text-success-foreground',
    animate: false,
  },
};

const RideStatusBanner = ({ phase, pilotName, className }: RideStatusBannerProps) => {
  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg transition-all duration-300',
        config.color,
        config.textColor,
        config.animate && 'animate-pulse',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="font-bold">{config.label}</p>
        <p className="text-sm opacity-90">
          {pilotName ? `${pilotName} ${config.description.toLowerCase()}` : config.description}
        </p>
      </div>
    </div>
  );
};

export default RideStatusBanner;
