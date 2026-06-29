import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { User, Session } from '@supabase/supabase-js';

interface PassengerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  cpf: string;
  photo_url: string | null;
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

interface PilotProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  cpf: string;
  photo_url: string | null;
  boat_type: string | null;
  boat_identification: string | null;
  boat_photos: string[];
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_rides: number;
  total_earnings: number;
  pix_key: string | null;
  boat_capacity: number;
  current_passengers: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  passengerProfile: PassengerProfile | null;
  pilotProfile: PilotProfile | null;
  signUpWithEmail: (
    email: string,
    password: string,
    userRole: UserRole,
    profileData: {
      fullName: string;
      phone: string;
      cpf: string;
      boatType?: string;
      boatIdentification?: string;
      pilotType?: 'pilot' | 'partner_boat';
    }
  ) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithGoogle: (role: UserRole) => Promise<any>;
  signInWithPhone: (phone: string) => Promise<any>;
  verifyOtp: (phone: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
  uploadPhoto: (file: File, bucket: 'avatars' | 'boat-photos') => Promise<string>;
  updatePassengerProfile: (updates: Partial<PassengerProfile>) => Promise<void>;
  updatePilotProfile: (updates: Partial<PilotProfile>) => Promise<void>;
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
