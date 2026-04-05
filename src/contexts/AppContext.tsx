import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { UserRole, RideStatus, Location, Pilot } from '@/types';
import { locations } from '@/data/mockData';
import { PRICE_TABLE, DEFAULT_PRICE, DISTANCE_TABLE, TIME_TABLE } from '@/data/pricingData';
import { supabase } from '@/integrations/supabase/client';

interface AppContextType {
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;
  rideStatus: RideStatus;
  setRideStatus: (status: RideStatus) => void;
  origin: Location | null;
  setOrigin: (location: Location | null) => void;
  destination: Location | null;
  setDestination: (location: Location | null) => void;
  currentPilot: Pilot | null;
  setCurrentPilot: (pilot: Pilot | null) => void;
  isPilotOnline: boolean;
  setIsPilotOnline: (online: boolean) => void;
  passengerCount: number;
  setPassengerCount: (count: number) => void;
  calculatePrice: () => number;
  calculateDistance: () => number;
  calculateTime: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [origin, setOriginState] = useState<Location | null>(() => {
    try {
      const stored = localStorage.getItem('gamma_ride_origin');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [destination, setDestinationState] = useState<Location | null>(() => {
    try {
      const stored = localStorage.getItem('gamma_ride_destination');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [currentPilot, setCurrentPilot] = useState<Pilot | null>(null);
  const [isPilotOnline, setIsPilotOnlineState] = useState(() => {
    try { return localStorage.getItem('gamma_pilot_online') === '1'; } catch { return false; }
  });
  const setIsPilotOnline = (online: boolean) => {
    try { localStorage.setItem('gamma_pilot_online', online ? '1' : '0'); } catch {}
    setIsPilotOnlineState(online);
  };
  const [passengerCount, setPassengerCount] = useState(1);

  // Wrapper setters to also persist to localStorage
  const setOrigin = (location: Location | null) => {
    setOriginState(location);
    try {
      if (location) {
        localStorage.setItem('gamma_ride_origin', JSON.stringify(location));
      } else {
        localStorage.removeItem('gamma_ride_origin');
      }
    } catch {}
  };

  const setDestination = (location: Location | null) => {
    setDestinationState(location);
    try {
      if (location) {
        localStorage.setItem('gamma_ride_destination', JSON.stringify(location));
      } else {
        localStorage.removeItem('gamma_ride_destination');
      }
    } catch {}
  };

  // Clear ride state when user logs out or changes to prevent stale data
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        setRideStatus('idle');
        setOrigin(null);
        setDestination(null);
        setCurrentPilot(null);
        setPassengerCount(1);
        setIsPilotOnline(false);
        // Also clear persisted ride locations
        try {
          localStorage.removeItem('gamma_ride_origin');
          localStorage.removeItem('gamma_ride_destination');
        } catch {}
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const calculateDistance = useCallback(() => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    // Real haversine distance in km from pre-computed matrix (meters → km)
    const meters = DISTANCE_TABLE[origin.id]?.[destination.id] ?? 0;
    return Math.round(meters / 100) / 10; // round to 1 decimal km
  }, [origin, destination]);

  const calculateTime = useCallback(() => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    // Real travel time in minutes from pre-computed matrix (boat ~20 km/h + docking)
    return TIME_TABLE[origin.id]?.[destination.id] ?? 2;
  }, [origin, destination]);

  const calculatePrice = useCallback((): number => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    return PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE;
  }, [origin, destination]);

  const contextValue = useMemo(() => ({
    userRole,
    setUserRole,
    rideStatus,
    setRideStatus,
    origin,
    setOrigin,
    destination,
    setDestination,
    currentPilot,
    setCurrentPilot,
    isPilotOnline,
    setIsPilotOnline,
    passengerCount,
    setPassengerCount,
    calculatePrice,
    calculateDistance,
    calculateTime,
  }), [userRole, rideStatus, origin, destination, currentPilot, isPilotOnline, passengerCount, calculatePrice, calculateDistance, calculateTime]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
