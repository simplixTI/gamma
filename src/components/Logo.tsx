import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white';
  showSubtitle?: boolean;
  className?: string;
}

const widths = { sm: 80, md: 120, lg: 180 };

function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'default',
  showSubtitle = false,
  className,
}) => {
  const w = widths[size];
  const isDark = useDarkMode();

  // variant='white' keeps filter (used on dark backgrounds like PilotDashboard header)
  // variant='default' uses logo-dark in dark mode, logo in light mode
  const src = variant === 'white'
    ? '/logo.png'
    : isDark ? '/logo.dark.png' : '/logo.png';

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <img
        src={src}
        alt="Gamma"
        width={w}
        style={{
          width: w,
          height: 'auto',
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none',
        }}
        draggable={false}
      />

      {showSubtitle && (
        <p className={cn(
          'font-medium tracking-wide',
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm',
          variant === 'white' ? 'text-white/70' : 'text-muted-foreground',
        )}>
          Transporte aquático na Gigoia
        </p>
      )}
    </div>
  );
};

export default Logo;
