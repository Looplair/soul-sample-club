export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: "trialing" | "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "paused";
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: "trialing" | "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "paused";
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          status?: "trialing" | "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "paused";
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      packs: {
        Row: {
          id: string;
          name: string;
          description: string;
          cover_image_url: string | null;
          release_date: string;
          is_published: boolean;
          is_staff_pick?: boolean; // Optional - column may not exist yet
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          cover_image_url?: string | null;
          release_date: string;
          is_published?: boolean;
          is_staff_pick?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          cover_image_url?: string | null;
          release_date?: string;
          is_published?: boolean;
          is_staff_pick?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      samples: {
        Row: {
          id: string;
          pack_id: string;
          name: string;
          file_path: string;
          preview_path: string | null;
          file_size: number;
          duration: number;
          bpm: number | null;
          key: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pack_id: string;
          name: string;
          file_path: string;
          preview_path?: string | null;
          file_size: number;
          duration: number;
          bpm?: number | null;
          key?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pack_id?: string;
          name?: string;
          file_path?: string;
          preview_path?: string | null;
          file_size?: number;
          duration?: number;
          bpm?: number | null;
          key?: string | null;
          order_index?: number;
          created_at?: string;
        };
      };
      downloads: {
        Row: {
          id: string;
          user_id: string;
          sample_id: string;
          downloaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sample_id: string;
          downloaded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sample_id?: string;
          downloaded_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: { user_id: string };
        Returns: boolean;
      };
      has_active_subscription: {
        Args: { user_id: string };
        Returns: boolean;
      };
      can_access_pack: {
        Args: { user_id: string; pack_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      subscription_status: "trialing" | "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "paused";
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Pack = Database["public"]["Tables"]["packs"]["Row"];
export type Sample = Database["public"]["Tables"]["samples"]["Row"];
export type Download = Database["public"]["Tables"]["downloads"]["Row"];

// Extended types with relations
export type PackWithSamples = Pack & {
  samples: Sample[];
};

export type SampleWithPack = Sample & {
  pack: Pack;
};

export type ProfileWithSubscription = Profile & {
  subscription: Subscription | null;
};
