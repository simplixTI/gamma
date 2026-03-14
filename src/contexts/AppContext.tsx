import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, RideStatus, Location, Pilot } from '@/types';
import { locations, mockPilot } from '@/data/mockData';
import { PRICE_TABLE, DEFAULT_PRICE, DISTANCE_TABLE, TIME_TABLE } from '@/data/pricingData';

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
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [currentPilot, setCurrentPilot] = useState<Pilot | null>(null);
  const [isPilotOnline, setIsPilotOnline] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);

  const calculateDistance = () => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    // Real haversine distance in km from pre-computed matrix (meters → km)
    const meters = DISTANCE_TABLE[origin.id]?.[destination.id] ?? 0;
    return Math.round(meters / 100) / 10; // round to 1 decimal km
  };

  const calculateTime = () => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    // Real travel time in minutes from pre-computed matrix (boat ~20 km/h + docking)
    return TIME_TABLE[origin.id]?.[destination.id] ?? 2;
  };

  const calculatePrice = (): number => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    return PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE;
  };

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
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
