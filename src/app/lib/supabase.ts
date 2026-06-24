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
      application_contacts: {
        Row: {
          id: string;
          application_id: string;
          contact_id: string;
          role_in_process: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["application_contacts"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["application_contacts"]["Insert"]
        >;
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
      interviews: {
        Row: {
          id: string;
          application_id: string;
          round_type: string;
          scheduled_at: string | null;
          interviewer_contact_id: string | null;
          notes: string;
          outcome: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["interviews"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["interviews"]["Insert"]>;
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          name: string;
          version_label: string;
          file_url: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["documents"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      application_documents: {
        Row: {
          id: string;
          application_id: string;
          document_id: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["application_documents"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["application_documents"]["Insert"]
        >;
      };
      offers: {
        Row: {
          id: string;
          application_id: string;
          base_salary: number | null;
          bonus: number | null;
          equity: string;
          signing_bonus: number | null;
          benefits_notes: string;
          currency: string;
          decision_deadline: string | null;
          decision: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["offers"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["offers"]["Insert"]>;
      };
    };
  };
};
