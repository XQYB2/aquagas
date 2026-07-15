import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'customer' | 'provider' | 'admin'
          suspended: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'suspended'> & { suspended?: boolean }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      providers: {
        Row: {
          id: string
          user_id: string
          store_name: string
          logo_url: string | null
          address: string
          lat: number | null
          lng: number | null
          service_type: 'water' | 'lpg' | 'both'
          is_open: boolean
          delivery_fee: number
          delivery_time_min: number
          rating: number
          review_count: number
          approval_status: 'pending' | 'active' | 'suspended'
          owner_email: string | null
          business_permit_url: string | null
          owner_id_url: string | null
          created_at: string
        }
        Insert: Partial<Omit<Database['public']['Tables']['providers']['Row'], 'id' | 'created_at'>> & { user_id: string; store_name: string; address: string }
        Update: Partial<Database['public']['Tables']['providers']['Row']>
      }
      products: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string | null
          price: number
          unit: string
          category: 'water' | 'lpg'
          image_url: string | null
          is_available: boolean
        }
        Insert: Partial<Omit<Database['public']['Tables']['products']['Row'], 'id'>> & { provider_id: string; name: string; price: number; category: 'water' | 'lpg' }
        Update: Partial<Database['public']['Tables']['products']['Row']>
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          provider_id: string
          status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_address: string
          delivery_lat: number | null
          delivery_lng: number | null
          payment_method: string
          notes: string | null
          admin_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>> & { customer_id: string; provider_id: string; total_amount: number; delivery_address: string }
        Update: Partial<Database['public']['Tables']['orders']['Row']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: Partial<Omit<Database['public']['Tables']['order_items']['Row'], 'id'>> & { order_id: string; quantity: number; unit_price: number }
        Update: Partial<Database['public']['Tables']['order_items']['Row']>
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          provider_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: Partial<Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'>> & { order_id: string; customer_id: string; provider_id: string; rating: number }
        Update: Partial<Database['public']['Tables']['reviews']['Row']>
      }
      platform_settings: {
        Row: {
          id: number
          platform_name: string
          commission_rate: number
          water_enabled: boolean
          lpg_enabled: boolean
          announcement: string | null
          announcement_active: boolean
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['platform_settings']['Row']>
        Update: Partial<Database['public']['Tables']['platform_settings']['Row']>
      }
    }
  }
}
