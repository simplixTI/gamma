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
      account_deletion_requests: {
        Row: {
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          pier_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          pier_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          pier_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          heading: number | null
          id: string
          is_available: boolean
          lat: number
          lng: number
          pilot_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          heading?: number | null
          id?: string
          is_available?: boolean
          lat: number
          lng: number
          pilot_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          heading?: number | null
          id?: string
          is_available?: boolean
          lat?: number
          lng?: number
          pilot_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_ads: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          position: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
          wallet_balance: number
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
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
          wallet_balance?: number
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
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      payment_audit_log: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          new_status: string | null
          old_status: string | null
          payment_id: string | null
          ride_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          new_status?: string | null
          old_status?: string | null
          payment_id?: string | null
          ride_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          old_status?: string | null
          payment_id?: string | null
          ride_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mp_payment_id: string | null
          paid_at: string | null
          passenger_device_id: string | null
          payment_method: string | null
          pilot_id: string | null
          pix_code: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          qr_code: string | null
          refund_amount: number | null
          refund_mp_id: string | null
          refund_reason: string | null
          refund_requested_at: string | null
          refund_status: string | null
          refunded_at: string | null
          ride_id: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          passenger_device_id?: string | null
          payment_method?: string | null
          pilot_id?: string | null
          pix_code?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          qr_code?: string | null
          refund_amount?: number | null
          refund_mp_id?: string | null
          refund_reason?: string | null
          refund_requested_at?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          ride_id?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          passenger_device_id?: string | null
          payment_method?: string | null
          pilot_id?: string | null
          pix_code?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          qr_code?: string | null
          refund_amount?: number | null
          refund_mp_id?: string | null
          refund_reason?: string | null
          refund_requested_at?: string | null
          refund_status?: string | null
          refunded_at?: string | null
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
      pier_prices: {
        Row: {
          dest_id: string
          origin_id: string
          price_per_person: number
        }
        Insert: {
          dest_id: string
          origin_id: string
          price_per_person: number
        }
        Update: {
          dest_id?: string
          origin_id?: string
          price_per_person?: number
        }
        Relationships: []
      }
      pilot_documents: {
        Row: {
          document_type: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string
          pilot_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type: string
          pilot_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string
          pilot_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_documents_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilot_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_documents_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilot_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_profiles: {
        Row: {
          approval_notes: string | null
          approval_status: string
          boat_capacity: number
          boat_identification: string | null
          boat_photos: string[] | null
          boat_type: string | null
          cpf: string
          created_at: string
          current_passengers: number
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_verified: boolean
          phone: string
          photo_url: string | null
          pix_key: string | null
          rating: number
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          total_earnings: number
          total_rides: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string
          boat_capacity?: number
          boat_identification?: string | null
          boat_photos?: string[] | null
          boat_type?: string | null
          cpf: string
          created_at?: string
          current_passengers?: number
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          phone: string
          photo_url?: string | null
          pix_key?: string | null
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          total_earnings?: number
          total_rides?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string
          boat_capacity?: number
          boat_identification?: string | null
          boat_photos?: string[] | null
          boat_type?: string | null
          cpf?: string
          created_at?: string
          current_passengers?: number
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          phone?: string
          photo_url?: string | null
          pix_key?: string | null
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
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
      push_tokens: {
        Row: {
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_discounts: {
        Row: {
          created_at: string
          discount_percent: number
          earned_from_user_id: string | null
          expires_at: string | null
          id: string
          is_used: boolean
          passenger_user_id: string
          used_at: string | null
          used_on_ride_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          earned_from_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
          passenger_user_id: string
          used_at?: string | null
          used_on_ride_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percent?: number
          earned_from_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
          passenger_user_id?: string
          used_at?: string | null
          used_on_ride_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_discounts_used_on_ride_id_fkey"
            columns: ["used_on_ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          reviewer_type: string
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          reviewer_type: string
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          reviewer_type?: string
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
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
          comment: string | null
          created_at: string
          id: string
          reviewee_id: string
          reviewer_id: string
          reviewer_role: string
          ride_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          reviewee_id: string
          reviewer_id: string
          reviewer_role: string
          ride_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          reviewee_id?: string
          reviewer_id?: string
          reviewer_role?: string
          ride_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_reviews_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          destination_address: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          destination_pier_id: string | null
          estimated_time: number | null
          id: string
          origin_address: string | null
          origin_lat: number
          origin_lng: number
          origin_name: string
          origin_pier_id: string | null
          passenger_count: number
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
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          destination_pier_id?: string | null
          estimated_time?: number | null
          id?: string
          origin_address?: string | null
          origin_lat: number
          origin_lng: number
          origin_name: string
          origin_pier_id?: string | null
          passenger_count?: number
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
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          destination_pier_id?: string | null
          estimated_time?: number | null
          id?: string
          origin_address?: string | null
          origin_lat?: number
          origin_lng?: number
          origin_name?: string
          origin_pier_id?: string | null
          passenger_count?: number
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
      saved_cards: {
        Row: {
          brand: string
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          holder_name: string | null
          id: string
          is_default: boolean
          last_four: string
          mp_card_id: string | null
          mp_customer_id: string | null
          mp_payment_method_id: string | null
          user_id: string
        }
        Insert: {
          brand?: string
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          last_four: string
          mp_card_id?: string | null
          mp_customer_id?: string | null
          mp_payment_method_id?: string | null
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          last_four?: string
          mp_card_id?: string | null
          mp_customer_id?: string | null
          mp_payment_method_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          mp_payment_id: string | null
          payment_id: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          pix_transaction_id: string | null
          ride_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mp_payment_id?: string | null
          payment_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          pix_transaction_id?: string | null
          ride_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mp_payment_id?: string | null
          payment_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          pix_transaction_id?: string | null
          ride_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pilot_active_passengers: {
        Row: {
          active_passengers: number | null
          pilot_user_id: string | null
        }
        Relationships: []
      }
      pilot_public_profiles: {
        Row: {
          approval_status: string | null
          boat_capacity: number | null
          boat_identification: string | null
          boat_photos: string[] | null
          boat_type: string | null
          current_passengers: number | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          phone: string | null
          photo_url: string | null
          rating: number | null
          total_rides: number | null
          user_id: string | null
        }
        Insert: {
          approval_status?: string | null
          boat_capacity?: number | null
          boat_identification?: string | null
          boat_photos?: string[] | null
          boat_type?: string | null
          current_passengers?: number | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          total_rides?: number | null
          user_id?: string | null
        }
        Update: {
          approval_status?: string | null
          boat_capacity?: number | null
          boat_identification?: string | null
          boat_photos?: string[] | null
          boat_type?: string | null
          current_passengers?: number | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          total_rides?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_pool_ride: {
        Args: {
          p_pilot_id: string
          p_pilot_name: string
          p_pilot_phone: string
          p_pilot_user_id: string
          p_ride_id: string
        }
        Returns: {
          message: string
          ride: Json
          success: boolean
        }[]
      }
      cancel_ride_by_pilot: {
        Args: { p_pilot_id: string; p_ride_id: string }
        Returns: Json
      }
      credit_wallet: {
        Args: {
          p_amount: number
          p_description: string
          p_transaction_id?: string
          p_user_id: string
        }
        Returns: number
      }
      debit_wallet: {
        Args: {
          p_amount: number
          p_description: string
          p_ride_id?: string
          p_user_id: string
        }
        Returns: number
      }
      get_ride_price: {
        Args: { p_dest_id: string; p_origin_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      pay_ride_with_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_ride_id: string
          p_user_id: string
        }
        Returns: Json
      }
      release_pool_ride: {
        Args: { p_pilot_user_id: string; p_ride_id: string }
        Returns: undefined
      }
      request_account_deletion: { Args: { p_user_id: string }; Returns: string }
      request_payment_refund: {
        Args: { p_reason?: string; p_ride_id: string }
        Returns: undefined
      }
      set_default_card: {
        Args: { p_card_id: string; p_user_id: string }
        Returns: undefined
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
