import { MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Location } from '@/types';

interface LocationCardProps {
  location: Location;
  isSelected?: boolean;
  onClick?: () => void;
  variant?: 'horizontal' | 'vertical';
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  isSelected = false,
  onClick,
  variant = 'vertical',
}) => {
  if (variant === 'horizontal') {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 w-full p-3 bg-card rounded-xl transition-all duration-200",
          "hover:shadow-soft active:scale-[0.99]",
          isSelected && "ring-2 ring-secondary shadow-soft"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          isSelected ? "bg-secondary" : "bg-success/10"
        )}>
          <MapPin className={cn(
            "w-4 h-4",
            isSelected ? "text-secondary-foreground" : "text-success"
          )} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{location.name}</p>
          <p className="text-xs text-muted truncate">{location.address}</p>
        </div>
        {location.estimatedTime && (
          <div className="flex items-center gap-1 text-muted shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{location.estimatedTime}</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 min-w-[100px] bg-card rounded-xl transition-all duration-200",
        "hover:shadow-soft active:scale-[0.98]",
        isSelected && "ring-2 ring-secondary shadow-soft"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        isSelected ? "bg-secondary" : "bg-secondary/10"
      )}>
        <MapPin className={cn(
          "w-5 h-5",
          isSelected ? "text-secondary-foreground" : "text-secondary"
        )} />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground text-xs leading-tight">{location.name}</p>
        <p className="text-[10px] text-muted">{location.estimatedTime}</p>
      </div>
    </button>
  );
};

export default LocationCard;
