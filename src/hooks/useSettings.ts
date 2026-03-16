import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface UserSettings {
  notifications: boolean;
  soundAlerts: boolean;
  autoNavigation: boolean;
  darkMode: boolean;
  shareLocation: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  notifications: true,
  soundAlerts: true,
  autoNavigation: true,
  darkMode: false,
  shareLocation: true,
};

export const useSettings = () => {
  const { user } = useAuthContext();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from database on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoaded(true);
      return;
    }

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('notifications, sound_alerts, auto_navigation, dark_mode, share_location')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading settings:', error);
          setIsLoaded(true);
          return;
        }

        if (data) {
          setSettings({
            notifications: data.notifications ?? DEFAULT_SETTINGS.notifications,
            soundAlerts: data.sound_alerts ?? DEFAULT_SETTINGS.soundAlerts,
            autoNavigation: data.auto_navigation ?? DEFAULT_SETTINGS.autoNavigation,
            darkMode: data.dark_mode ?? DEFAULT_SETTINGS.darkMode,
            shareLocation: data.share_location ?? DEFAULT_SETTINGS.shareLocation,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
      setIsLoaded(true);
    };

    loadSettings();
  }, [user?.id]);

  // Apply dark mode class to document
  useEffect(() => {
    if (isLoaded) {
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.darkMode, isLoaded]);

  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notifications: newSettings.notifications,
          sound_alerts: newSettings.soundAlerts,
          auto_navigation: newSettings.autoNavigation,
          dark_mode: newSettings.darkMode,
          share_location: newSettings.shareLocation,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      // Save to database (fire and forget, errors logged)
      saveSettings(newSettings).catch((err) => console.error('Failed to save settings:', err));
      return newSettings;
    });
  }, [saveSettings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error resetting settings:', error);
      }
    }
  }, [user?.id]);

  return {
    settings,
    isLoaded,
    isSaving,
    updateSetting,
    resetSettings,
  };
};
