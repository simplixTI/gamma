export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      passenger_profiles: {
        Row: {
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          photo_url: string | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          photo_url?: string | null
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          photo_url?: string | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          pix_code: string | null
          qr_code: string | null
          ride_id: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          pix_code?: string | null
          qr_code?: string | null
          ride_id?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          pix_code?: string | null
          qr_code?: string | null
          ride_id?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_profiles: {
        Row: {
          boat_identification: string | null
          boat_photos: string[] | null
          boat_type: string | null
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_verified: boolean
          phone: string
          photo_url: string | null
          pix_key: string | null
          rating: number
          total_earnings: number
          total_rides: number
          updated_at: string
          user_id: string
        }
        Insert: {
          boat_identification?: string | null
          boat_photos?: string[] | null
          boat_type?: string | null
          cpf: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          phone: string
          photo_url?: string | null
          pix_key?: string | null
          rating?: number
          total_earnings?: number
          total_rides?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          boat_identification?: string | null
          boat_photos?: string[] | null
          boat_type?: string | null
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          phone?: string
          photo_url?: string | null
          pix_key?: string | null
          rating?: number
          total_earnings?: number
          total_rides?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pilots: {
        Row: {
          created_at: string
          device_id: string
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      ride_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          ride_id: string
          sender_device_id: string | null
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          ride_id: string
          sender_device_id?: string | null
          sender_type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          ride_id?: string
          sender_device_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_reviews: {
        Row: {
          id: string
          ride_id: string
          reviewer_id: string
          reviewee_id: string
          reviewer_role: string
          stars: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ride_id: string
          reviewer_id: string
          reviewee_id: string
          reviewer_role: string
          stars: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ride_id?: string
          reviewer_id?: string
          reviewee_id?: string
          reviewer_role?: string
          stars?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_reviews_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          }
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          destination_address: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          estimated_time: number | null
          id: string
          origin_address: string | null
          origin_lat: number
          origin_lng: number
          origin_name: string
          passenger_device_id: string
          passenger_lat: number | null
          passenger_lng: number | null
          passenger_name: string | null
          passenger_phone: string | null
          passenger_user_id: string | null
          payment_status: string | null
          pilot_id: string | null
          pilot_lat: number | null
          pilot_lng: number | null
          pilot_name: string | null
          pilot_phone: string | null
          pilot_user_id: string | null
          price: number
          rating: number | null
          rating_comment: string | null
          started_at: string | null
          status: string
          tip: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          estimated_time?: number | null
          id?: string
          origin_address?: string | null
          origin_lat: number
          origin_lng: number
          origin_name: string
          passenger_device_id: string
          passenger_lat?: number | null
          passenger_lng?: number | null
          passenger_name?: string | null
          passenger_phone?: string | null
          passenger_user_id?: string | null
          payment_status?: string | null
          pilot_id?: string | null
          pilot_lat?: number | null
          pilot_lng?: number | null
          pilot_name?: string | null
          pilot_phone?: string | null
          pilot_user_id?: string | null
          price?: number
          rating?: number | null
          rating_comment?: string | null
          started_at?: string | null
          status?: string
          tip?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          estimated_time?: number | null
          id?: string
          origin_address?: string | null
          origin_lat?: number
          origin_lng?: number
          origin_name?: string
          passenger_device_id?: string
          passenger_lat?: number | null
          passenger_lng?: number | null
          passenger_name?: string | null
          passenger_phone?: string | null
          passenger_user_id?: string | null
          payment_status?: string | null
          pilot_id?: string | null
          pilot_lat?: number | null
          pilot_lng?: number | null
          pilot_name?: string | null
          pilot_phone?: string | null
          pilot_user_id?: string | null
          price?: number
          rating?: number | null
          rating_comment?: string | null
          started_at?: string | null
          status?: string
          tip?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_navigation: boolean
          created_at: string
          dark_mode: boolean
          id: string
          notifications: boolean
          share_location: boolean
          sound_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_navigation?: boolean
          created_at?: string
          dark_mode?: boolean
          id?: string
          notifications?: boolean
          share_location?: boolean
          sound_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_navigation?: boolean
          created_at?: string
          dark_mode?: boolean
          id?: string
          notifications?: boolean
          share_location?: boolean
          sound_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "passenger" | "pilot"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["passenger", "pilot"],
    },
  },
} as const
