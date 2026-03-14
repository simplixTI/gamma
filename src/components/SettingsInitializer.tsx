import { useEffect, ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface SettingsInitializerProps {
  children: ReactNode;
}

export const SettingsInitializer = ({ children }: SettingsInitializerProps) => {
  const { settings, isLoaded } = useSettings();

  // Apply dark mode on initial load and when settings change
  useEffect(() => {
    if (isLoaded) {
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isLoaded, settings.darkMode]);

  return <>{children}</>;
};

export default SettingsInitializer;
