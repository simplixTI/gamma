import { Anchor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white';
  showSubtitle?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'default',
  showSubtitle = false 
}) => {
  const sizes = {
    sm: { icon: 24, text: 'text-xl', subtitle: 'text-xs' },
    md: { icon: 40, text: 'text-3xl', subtitle: 'text-sm' },
    lg: { icon: 56, text: 'text-5xl', subtitle: 'text-base' },
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl",
          variant === 'default' ? 'bg-secondary' : 'bg-primary-foreground/20'
        )}>
          <Anchor 
            size={sizes[size].icon} 
            className={variant === 'default' ? 'text-secondary-foreground' : 'text-primary-foreground'} 
            strokeWidth={2.5}
          />
        </div>
        <span className={cn(
          "font-bold tracking-tight",
          sizes[size].text,
          variant === 'default' ? 'text-foreground' : 'text-primary-foreground'
        )}>
          Gamma
        </span>
      </div>
      {showSubtitle && (
        <p className={cn(
          "font-medium",
          sizes[size].subtitle,
          variant === 'default' ? 'text-muted' : 'text-primary-foreground/70'
        )}>
          Transporte aquático na Gigoia
        </p>
      )}
    </div>
  );
};

export default Logo;
