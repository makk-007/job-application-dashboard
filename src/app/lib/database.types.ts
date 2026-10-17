export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      application_contacts: {
        Row: {
          application_id: string
          contact_id: string
          id: string
          role_in_process: string | null
        }
        ComputedFields: never
        Insert: {
          application_id: string
          contact_id: string
          id?: string
          role_in_process?: string | null
        }
        Update: {
          application_id?: string
          contact_id?: string
          id?: string
          role_in_process?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_contacts_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_contacts_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          document_id: string
          id: string
        }
        ComputedFields: never
        Insert: {
          application_id: string
          document_id: string
          id?: string
        }
        Update: {
          application_id?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_date: string | null
          company_id: string
          contact_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          job_post_url: string | null
          location: string | null
          notes: string | null
          relocation_required: boolean
          relocation_sponsored: boolean
          role_title: string
          round_id: string | null
          salary_max: number | null
          salary_min: number | null
          source: string
          status: string
          updated_at: string | null
          user_id: string
          work_type: string
        }
        ComputedFields: never
        Insert: {
          applied_date?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          job_post_url?: string | null
          location?: string | null
          notes?: string | null
          relocation_required?: boolean
          relocation_sponsored?: boolean
          role_title: string
          round_id?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source?: string
          status?: string
          updated_at?: string | null
          user_id: string
          work_type?: string
        }
        Update: {
          applied_date?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          job_post_url?: string | null
          location?: string | null
          notes?: string | null
          relocation_required?: boolean
          relocation_sponsored?: boolean
          role_title?: string
          round_id?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_round_id_fkey"
            columns: ["round_id"]
            referencedRelation: "job_search_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist: {
        Row: {
          application_id: string
          completed: boolean | null
          created_at: string | null
          id: string
          item: string
        }
        ComputedFields: never
        Insert: {
          application_id: string
          completed?: boolean | null
          created_at?: string | null
          id?: string
          item: string
        }
        Update: {
          application_id?: string
          completed?: boolean | null
          created_at?: string | null
          id?: string
          item?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          last_contacted_at: string | null
          name: string
          notes: string | null
          phone: string | null
          relationship: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        ComputedFields: never
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          name: string
          type: string
          user_id: string
          version_label: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          type?: string
          user_id: string
          version_label?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
          version_label?: string | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          interviewer_contact_id: string | null
          notes: string | null
          outcome: string
          round_type: string
          scheduled_at: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          interviewer_contact_id?: string | null
          notes?: string | null
          outcome?: string
          round_type?: string
          scheduled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          interviewer_contact_id?: string | null
          notes?: string | null
          outcome?: string
          round_type?: string
          scheduled_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_interviewer_contact_id_fkey"
            columns: ["interviewer_contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_search_rounds: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          application_id: string
          base_salary: number | null
          benefits_notes: string | null
          bonus: number | null
          created_at: string | null
          currency: string | null
          decision: string
          decision_deadline: string | null
          equity: string | null
          id: string
          notes: string | null
          signing_bonus: number | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          application_id: string
          base_salary?: number | null
          benefits_notes?: string | null
          bonus?: number | null
          created_at?: string | null
          currency?: string | null
          decision?: string
          decision_deadline?: string | null
          equity?: string | null
          id?: string
          notes?: string | null
          signing_bonus?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          base_salary?: number | null
          benefits_notes?: string | null
          bonus?: number | null
          created_at?: string | null
          currency?: string | null
          decision?: string
          decision_deadline?: string | null
          equity?: string | null
          id?: string
          notes?: string | null
          signing_bonus?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          application_id: string
          changed_at: string | null
          from_status: string | null
          id: string
          to_status: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          application_id: string
          changed_at?: string | null
          from_status?: string | null
          id?: string
          to_status: string
          user_id: string
        }
        Update: {
          application_id?: string
          changed_at?: string | null
          from_status?: string | null
          id?: string
          to_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      uuid_generate_v1: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_generate_v1mc: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_ns_dns: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_ns_oid: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_ns_url: { Args: Record<PropertyKey, never>; Returns: string }
      uuid_ns_x500: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
