import { useState, useEffect, useCallback } from 'react';
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
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [passengerProfile, setPassengerProfile] = useState<PassengerProfile | null>(null);
  const [pilotProfile, setPilotProfile] = useState<PilotProfile | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setPassengerProfile(null);
          setPilotProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = useCallback(async (userId: string) => {
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
        const pendingRole = sessionStorage.getItem('pending_oauth_role') as UserRole | null;
        if (pendingRole) {
          sessionStorage.removeItem('pending_oauth_role');
          await createOAuthProfile(userId, pendingRole);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createOAuthProfile = async (userId: string, role: UserRole) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const fullName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || '';
    const email = currentUser?.email || '';

    await supabase.from('user_roles').insert({ user_id: userId, role });

    if (role === 'passenger') {
      await supabase.from('passenger_profiles').insert({
        user_id: userId,
        full_name: fullName,
        phone: '',
        email,
        cpf: '',
      });
      await fetchPassengerProfile(userId);
    } else {
      await supabase.from('pilot_profiles').insert({
        user_id: userId,
        full_name: fullName,
        phone: '',
        email,
        cpf: '',
      });
      await fetchPilotProfile(userId);
    }
    setRole(role);
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
    }
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
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
    // Store role in sessionStorage (cleared on tab close; safer than localStorage for XSS)
    sessionStorage.setItem('pending_oauth_role', role);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
    setUser(null);
    setSession(null);
    setRole(null);
    setPassengerProfile(null);
    setPilotProfile(null);
  };

  const uploadPhoto = async (file: File, bucket: 'avatars' | 'boat-photos') => {
    if (!user) throw new Error('User not authenticated');

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

    const { error } = await supabase
      .from('passenger_profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    await fetchPassengerProfile(user.id);
  };

  const updatePilotProfile = async (updates: Partial<PilotProfile>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('pilot_profiles')
      .update(updates)
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
