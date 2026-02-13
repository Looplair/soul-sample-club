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
          username: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          username?: string | null;
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
      patreon_links: {
        Row: {
          id: string;
          user_id: string;
          patreon_user_id: string;
          patreon_email: string;
          access_token: string;
          refresh_token: string;
          is_active: boolean;
          tier_id: string | null;
          tier_title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          patreon_user_id: string;
          patreon_email: string;
          access_token: string;
          refresh_token: string;
          is_active?: boolean;
          tier_id?: string | null;
          tier_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          patreon_user_id?: string;
          patreon_email?: string;
          access_token?: string;
          refresh_token?: string;
          is_active?: boolean;
          tier_id?: string | null;
          tier_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      packs: {
        Row: {
          id: string;
          name: string;
          description: string;
          cover_image_url: string | null;
          release_date: string;
          end_date: string | null;
          is_published: boolean;
          is_staff_pick?: boolean;
          is_bonus: boolean;
          is_returned?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          cover_image_url?: string | null;
          release_date: string;
          end_date?: string | null;
          is_published?: boolean;
          is_staff_pick?: boolean;
          is_bonus?: boolean;
          is_returned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          cover_image_url?: string | null;
          release_date?: string;
          end_date?: string | null;
          is_published?: boolean;
          is_staff_pick?: boolean;
          is_bonus?: boolean;
          is_returned?: boolean;
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
          stems_path: string | null;
          file_size: number;
          duration: number;
          bpm: number | null;
          key: string | null;
          order_index: number;
          waveform_peaks: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pack_id: string;
          name: string;
          file_path: string;
          preview_path?: string | null;
          stems_path?: string | null;
          file_size: number;
          duration: number;
          bpm?: number | null;
          key?: string | null;
          order_index?: number;
          waveform_peaks?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pack_id?: string;
          name?: string;
          file_path?: string;
          preview_path?: string | null;
          stems_path?: string | null;
          file_size?: number;
          duration?: number;
          bpm?: number | null;
          key?: string | null;
          order_index?: number;
          waveform_peaks?: number[] | null;
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
      likes: {
        Row: {
          id: string;
          user_id: string;
          sample_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sample_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sample_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          type: "new_pack" | "returned_pack" | "announcement" | "custom";
          pack_id: string | null;
          link_url: string | null;
          link_new_tab: boolean;
          created_by: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          type?: "new_pack" | "returned_pack" | "announcement" | "custom";
          pack_id?: string | null;
          link_url?: string | null;
          link_new_tab?: boolean;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          type?: "new_pack" | "returned_pack" | "announcement" | "custom";
          pack_id?: string | null;
          link_url?: string | null;
          link_new_tab?: boolean;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      notification_reads: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          read_at: string;
          dismissed: boolean;
        };
        Insert: {
          id?: string;
          notification_id: string;
          user_id: string;
          read_at?: string;
          dismissed?: boolean;
        };
        Update: {
          id?: string;
          notification_id?: string;
          user_id?: string;
          read_at?: string;
          dismissed?: boolean;
        };
      };
      pack_votes: {
        Row: {
          id: string;
          user_id: string;
          pack_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pack_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pack_id?: string;
          created_at?: string;
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
export type PatreonLink = Database["public"]["Tables"]["patreon_links"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type Pack = Database["public"]["Tables"]["packs"]["Row"];
export type Sample = Database["public"]["Tables"]["samples"]["Row"];
export type Download = Database["public"]["Tables"]["downloads"]["Row"];
export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type PackVote = Database["public"]["Tables"]["pack_votes"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationRead = Database["public"]["Tables"]["notification_reads"]["Row"];

export type NotificationWithReadStatus = Notification & {
  is_read: boolean;
  pack?: Pick<Pack, "id" | "name" | "cover_image_url"> | null;
};

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

// Sample with like status
export type SampleWithLike = Sample & {
  is_liked?: boolean;
  pack?: Pack;
};

// Chat message with user profile
export type ChatMessageWithUser = ChatMessage & {
  profile: Pick<Profile, "id" | "username" | "avatar_url">;
};
