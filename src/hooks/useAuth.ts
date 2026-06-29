import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'passenger' | 'pilot';

interface PassengerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  cpf: string;
  photo_url: string | null;
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
  approval_status?: 'pending' | 'under_review' | 'approved' | 'rejected';
  submitted_at?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [passengerProfile, setPassengerProfile] = useState<PassengerProfile | null>(null);
  const [pilotProfile, setPilotProfile] = useState<PilotProfile | null>(null);
  // Deduplication: track whether a role fetch is already in-flight
  const fetchingRef = useRef(false);

  useEffect(() => {
    let initialSessionHandled = false;

    // Safety timeout: if loading is still true after 8 seconds, force it off
    // to prevent an infinite spinner caused by a Supabase network error or
    // missing user_roles row.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    // FIRST check existing session synchronously, then subscribe
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionHandled = true;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && !fetchingRef.current) {
        fetchUserRole(session.user.id);
      } else if (!session?.user) {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Skip if getSession() already triggered a fetch (INITIAL_SESSION fires simultaneously)
          if (event === 'INITIAL_SESSION' && initialSessionHandled) return;
          if (!fetchingRef.current) {
            setTimeout(() => fetchUserRole(session.user.id), 0);
          }
        } else {
          setRole(null);
          setPassengerProfile(null);
          setPilotProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const fetchUserRole = useCallback(async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching role:', roleError);
        setLoading(false);
        return;
      }

      if (roleData) {
        const userRole = roleData.role as UserRole;
        setRole(userRole);

        if (userRole === 'passenger') {
          await fetchPassengerProfile(userId);
        } else if (userRole === 'pilot') {
          await fetchPilotProfile(userId);
        }
      } else {
        // No role found — could be OAuth user returning from redirect
        let pendingRole: UserRole | null = null;
        const raw = sessionStorage.getItem('pending_oauth_role');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Discard if older than 10 minutes to avoid stale role from a previous login
            if (Date.now() - parsed.ts > 10 * 60 * 1000) {
              sessionStorage.removeItem('pending_oauth_role');
            } else {
              // Validate role value is a known valid role before using it
              const rawRole = parsed.role;
              if (rawRole === 'passenger' || rawRole === 'pilot') {
                pendingRole = rawRole;
              }
            }
          } catch {
            // Legacy plain-string format — validate before accepting
            if (raw === 'passenger' || raw === 'pilot') {
              pendingRole = raw as UserRole;
            }
          }
        }
        if (pendingRole) {
          sessionStorage.removeItem('pending_oauth_role');
          await createOAuthProfile(userId, pendingRole);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchingRef]);

  const createOAuthProfile = async (userId: string, _requestedRole: UserRole) => {
    // OAuth users always get the passenger role — pilot accounts require the dedicated
    // registration form and admin approval. Never trust a client-supplied role for pilots.
    const assignedRole: UserRole = 'passenger';
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const fullName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || '';
    const email = currentUser?.email || '';

    // Add small random delay to prevent simultaneous profile creation race condition
    await new Promise(r => setTimeout(r, Math.random() * 1000));

    const { error: roleError } = await supabase.from('user_roles').insert({ user_id: userId, role: assignedRole });
    if (roleError) throw new Error(`Erro ao criar perfil: ${roleError.message}`);

    const { error: profileError } = await supabase.from('passenger_profiles').insert({
      user_id: userId,
      full_name: fullName,
      phone: '',
      email,
      cpf: '',
    });
    if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    await fetchPassengerProfile(userId);
    setRole(assignedRole);
  };

  const fetchPassengerProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('passenger_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setPassengerProfile(data as PassengerProfile);
    }
  };

  const fetchPilotProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('pilot_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setPilotProfile(data as PilotProfile);
    }
  };

  const signUpWithEmail = async (
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
  ) => {
    const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin;
    const redirectUrl = `${appUrl}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: profileData.fullName,
          phone: profileData.phone,
          role: userRole,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: userRole,
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
        throw roleError;
      }

      // Create profile based on role
      if (userRole === 'passenger') {
        const { error: profileError } = await supabase
          .from('passenger_profiles')
          .insert({
            user_id: data.user.id,
            full_name: profileData.fullName,
            phone: profileData.phone,
            email: email,
            cpf: profileData.cpf,
          });

        if (profileError) {
          console.error('Error creating passenger profile:', profileError);
          throw profileError;
        }
      } else if (userRole === 'pilot') {
        const { error: profileError } = await supabase
          .from('pilot_profiles')
          .insert({
            user_id: data.user.id,
            full_name: profileData.fullName,
            phone: profileData.phone,
            email: email,
            cpf: profileData.cpf,
            boat_type: profileData.boatType,
            boat_identification: profileData.boatIdentification,
            pilot_type: profileData.pilotType ?? 'pilot',
          });

        if (profileError) {
          console.error('Error creating pilot profile:', profileError);
          throw profileError;
        }
      }
    }

    return data;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const signInWithGoogle = async (role: UserRole) => {
    // Store role in sessionStorage with timestamp so it can be discarded if stale
    sessionStorage.setItem('pending_oauth_role', JSON.stringify({ role, ts: Date.now() }));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${(import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    return data;
  };

  const signInWithPhone = async (phone: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair');
      throw error;
    }
    sessionStorage.removeItem('pending_oauth_role');
    setUser(null);
    setSession(null);
    setRole(null);
    setPassengerProfile(null);
    setPilotProfile(null);
  };

  const uploadPhoto = async (file: File, bucket: 'avatars' | 'boat-photos') => {
    if (!user) throw new Error('User not authenticated');

    // Validate file size (max 5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`Arquivo muito grande. Máximo permitido: 5MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    }

    // Validate file type (images only)
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      throw new Error('Formato inválido. Use JPG, PNG, WebP ou HEIC.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const updatePassengerProfile = async (updates: Partial<PassengerProfile>) => {
    if (!user) throw new Error('User not authenticated');

    // Strip fields that must not be set client-side
    const safeUpdates = { ...updates };
    delete (safeUpdates as Record<string, unknown>).wallet_balance;
    delete (safeUpdates as Record<string, unknown>).rating;
    delete (safeUpdates as Record<string, unknown>).user_id;

    const { error } = await supabase
      .from('passenger_profiles')
      .update(safeUpdates)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    await fetchPassengerProfile(user.id);
  };

  const updatePilotProfile = async (updates: Partial<PilotProfile>) => {
    if (!user) throw new Error('User not authenticated');

    // Strip fields that pilots must never change themselves — approval state is
    // exclusively managed by admins via the admin panel.
    const safeUpdates = { ...updates };
    delete (safeUpdates as Record<string, unknown>).is_verified;
    delete (safeUpdates as Record<string, unknown>).is_active;
    delete (safeUpdates as Record<string, unknown>).approval_status;
    delete (safeUpdates as Record<string, unknown>).reviewed_by;
    delete (safeUpdates as Record<string, unknown>).reviewed_at;
    delete (safeUpdates as Record<string, unknown>).total_earnings;
    delete (safeUpdates as Record<string, unknown>).rating;

    const { error } = await supabase
      .from('pilot_profiles')
      .update(safeUpdates)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    await fetchPilotProfile(user.id);
  };

  const refetchProfile = useCallback(() => {
    if (user) {
      fetchUserRole(user.id);
    }
  }, [user, fetchUserRole]);

  return {
    user,
    session,
    loading,
    role,
    passengerProfile,
    pilotProfile,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhone,
    verifyOtp,
    signOut,
    uploadPhoto,
    updatePassengerProfile,
    updatePilotProfile,
    refetchProfile,
  };
}
