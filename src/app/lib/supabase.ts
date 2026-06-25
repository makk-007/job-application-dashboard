import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      job_search_rounds: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["job_search_rounds"]["Row"],
          "id" | "user_id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["job_search_rounds"]["Insert"]
        >;
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          website: string;
          industry: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["companies"]["Row"],
          "id" | "user_id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
          name: string;
          role: string;
          email: string;
          phone: string;
          relationship: string;
          last_contacted_at: string | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["contacts"]["Row"],
          "id" | "user_id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          round_id: string | null;
          company_id: string;
          contact_id: string | null;
          role_title: string;
          job_post_url: string;
          source: string;
          work_type: string;
          relocation_required: boolean;
          relocation_sponsored: boolean;
          salary_min: number | null;
          salary_max: number | null;
          currency: string;
          status: string;
          applied_date: string | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["applications"]["Row"],
          "id" | "user_id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
      };
      checklist: {
        Row: {
          id: string;
          application_id: string;
          item: string;
          completed: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["checklist"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["checklist"]["Insert"]>;
      };
      status_history: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          from_status: string | null;
          to_status: string;
          changed_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["status_history"]["Row"],
          "id" | "changed_at"
        >;
        Update: never;
      };
    };
  };
};
