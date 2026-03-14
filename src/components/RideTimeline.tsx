import { Check, Navigation, MapPin, Clock, Flag, Anchor } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineStep = 'accepted' | 'going_to_passenger' | 'waiting' | 'in_progress' | 'completed';

interface RideTimelineProps {
  currentStep: TimelineStep;
  className?: string;
}

const steps = [
  { id: 'accepted', label: 'Aceita', icon: Check, shortLabel: 'Aceita' },
  { id: 'going_to_passenger', label: 'Indo ao embarque', icon: Navigation, shortLabel: 'A caminho' },
  { id: 'waiting', label: 'Aguardando', icon: MapPin, shortLabel: 'Aguardando' },
  { id: 'in_progress', label: 'Em viagem', icon: Anchor, shortLabel: 'Navegando' },
  { id: 'completed', label: 'Concluída', icon: Flag, shortLabel: 'Fim' },
];

const stepOrder: TimelineStep[] = ['accepted', 'going_to_passenger', 'waiting', 'in_progress', 'completed'];

const RideTimeline = ({ currentStep, className }: RideTimelineProps) => {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className={cn('bg-card rounded-xl p-4 shadow-soft', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              {/* Connector line (before icon) */}
              {index > 0 && (
                <div className="absolute h-0.5 w-full -z-10" style={{ left: '-50%', top: '50%' }}>
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
                    )}
                  />
                </div>
              )}

              {/* Step icon */}
              <div className="relative">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-success text-success-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/30 animate-pulse',
                    isPending && 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                
                {/* Progress line */}
                {index < steps.length - 1 && (
                  <div className="absolute top-1/2 left-full w-full -translate-y-1/2">
                    <div
                      className={cn(
                        'h-0.5 transition-all duration-500',
                        index < currentIndex ? 'bg-success' : 'bg-border'
                      )}
                      style={{ width: 'calc(100% - 8px)', marginLeft: '4px' }}
                    />
                  </div>
                )}
              </div>

              {/* Label */}
              <p
                className={cn(
                  'text-xs mt-2 text-center font-medium transition-colors',
                  isCompleted && 'text-success',
                  isCurrent && 'text-primary',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step.shortLabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RideTimeline;
