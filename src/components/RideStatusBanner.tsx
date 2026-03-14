import { CheckCircle, Clock, MapPin, Navigation } from 'lucide-react';
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
    bg: 'bg-secondary',
    ring: 'ring-secondary/30',
    animate: true,
  },
  accepted: {
    icon: CheckCircle,
    label: 'Piloto aceitou!',
    description: 'está a caminho',
    bg: 'bg-success',
    ring: 'ring-success/30',
    animate: false,
  },
  pilot_arriving: {
    icon: MapPin,
    label: 'Piloto chegou!',
    description: 'Dirija-se ao ponto de embarque',
    bg: 'bg-primary',
    ring: 'ring-primary/30',
    animate: true,
  },
  in_progress: {
    icon: Navigation,
    label: 'Em viagem',
    description: 'Navegando para o destino',
    bg: 'bg-primary',
    ring: 'ring-primary/30',
    animate: false,
  },
  completed: {
    icon: CheckCircle,
    label: 'Viagem concluída',
    description: 'Obrigado por viajar conosco!',
    bg: 'bg-success',
    ring: 'ring-success/30',
    animate: false,
  },
};

const RideStatusBanner = ({ phase, pilotName, className }: RideStatusBannerProps) => {
  const config = phaseConfig[phase];
  const Icon = config.icon;

  const desc = pilotName && config.description !== 'Dirija-se ao ponto de embarque' && config.description !== 'Navegando para o destino' && config.description !== 'Aguardando um piloto aceitar sua corrida' && config.description !== 'Obrigado por viajar conosco!'
    ? `${pilotName} ${config.description}`
    : config.description;

  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-300 text-white',
        config.bg,
        config.animate && 'animate-pulse',
        className
      )}
      style={{ boxShadow: `0 4px 20px hsl(var(--primary) / 0.25)` }}
    >
      {/* Icon container */}
      <div className={cn(
        'w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 ring-2',
        config.ring
      )}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm leading-tight">{config.label}</p>
        <p className="text-white/80 text-xs mt-0.5 truncate">{desc}</p>
      </div>
    </div>
  );
};

export default RideStatusBanner;
