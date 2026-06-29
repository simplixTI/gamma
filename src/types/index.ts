export type UserRole = 'passenger' | 'pilot';

/**
 * Location interface for the app
 * IMPORTANT: coordinates are in [longitude, latitude] format (GeoJSON standard)
 * When using with Google Maps or database, convert: lat = coordinates[1], lng = coordinates[0]
 */
export interface Location {
  id: string;
  name: string;
  address: string;
  /** Coordinates in [longitude, latitude] format (GeoJSON standard) */
  coordinates: [number, number];
  image?: string;
  estimatedTime?: string;
}

export interface Pilot {
  id: string;
  name: string;
  photo: string;
  rating: number;
  /** Boat display name — `boat_identification` when available, falls back to `boat_type`. */
  boat: string;
  /** Free-form boat type (e.g. "Lancha", "Bote") when present alongside the boat name. */
  boatType?: string;
  /** Boat color value from BOAT_COLORS palette (see src/utils/boatColors.ts). */
  boatColor?: string;
  phone: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhoto: string;
  pilotId?: string;
  origin: Location;
  destination: Location;
  status: 'pending' | 'accepted' | 'pilot_arriving' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  estimatedTime: number;
  distance: number;
  createdAt: Date;
  passengerCount: number;
  originPierId?: string;
  destinationPierId?: string;
}

export type RideStatus = 'idle' | 'requesting' | 'searching' | 'matched' | 'arriving' | 'in_progress' | 'completed';

// Database ride type (from Supabase)
export interface DbRide {
  id: string;
  passenger_device_id: string;
  passenger_name: string | null;
  passenger_phone: string | null;
  passenger_user_id?: string | null;
  pilot_id: string | null;
  pilot_name: string | null;
  pilot_phone: string | null;
  pilot_user_id?: string | null;
  origin_name: string;
  origin_address: string | null;
  origin_lat: number;
  origin_lng: number;
  destination_name: string | null;
  destination_address: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  passenger_lat: number | null;
  passenger_lng: number | null;
  pilot_lat: number | null;
  pilot_lng: number | null;
  status: 'pending' | 'accepted' | 'pilot_arriving' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  estimated_time: number | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  tip?: number | null;
  payment_status?: string | null;
  payment_method?: 'wallet' | 'pix' | 'card' | null;
  cancellation_fee?: number | null;
  cancelled_by?: string | null;
  // Pool fields
  passenger_count: number;
  origin_pier_id: string | null;
  destination_pier_id: string | null;
}