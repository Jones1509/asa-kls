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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_reports: {
        Row: {
          answers: Json
          audit_date: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          answers?: Json
          audit_date?: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          answers?: Json
          audit_date?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: []
      }
      case_assignments: {
        Row: {
          case_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          address: string
          case_number: string
          created_at: string
          created_by: string | null
          customer: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          case_number: string
          created_at?: string
          created_by?: string | null
          customer: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          case_number?: string
          created_at?: string
          created_by?: string | null
          customer?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          created_at: string
          created_by: string
          document_name: string
          document_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document_name: string
          document_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      deviations: {
        Row: {
          case_id: string | null
          corrective_action: string | null
          created_at: string
          created_by: string
          description: string
          deviation_date: string
          id: string
          responsible_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by: string
          description: string
          deviation_date?: string
          id?: string
          responsible_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string
          description?: string
          deviation_date?: string
          id?: string
          responsible_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deviations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certificates: {
        Row: {
          certificate_name: string
          created_at: string
          file_url: string | null
          id: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          certificate_name: string
          created_at?: string
          file_url?: string | null
          id?: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          certificate_name?: string
          created_at?: string
          file_url?: string | null
          id?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      field_reports: {
        Row: {
          admin_response: string | null
          case_id: string | null
          created_at: string
          id: string
          image_urls: string[] | null
          is_read: boolean
          message: string
          priority: string
          responded_at: string | null
          subject: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_read?: boolean
          message: string
          priority?: string
          responded_at?: string | null
          subject: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_read?: boolean
          message?: string
          priority?: string
          responded_at?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          certificate_url: string | null
          created_at: string
          created_by: string
          id: string
          last_calibrated: string | null
          name: string
          next_calibration: string | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_calibrated?: string | null
          name: string
          next_calibration?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_calibrated?: string | null
          name?: string
          next_calibration?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          case_id: string
          created_at: string
          created_by: string
          customer: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          paid_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          case_id: string
          created_at?: string
          created_by: string
          customer: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string
          created_at?: string
          created_by?: string
          customer?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_title: string
          created_at: string
          education_plan: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_title?: string
          created_at?: string
          education_plan?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_title?: string
          created_at?: string
          education_plan?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          observations: string | null
          recommendations: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          observations?: string | null
          recommendations?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          observations?: string | null
          recommendations?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          case_id: string | null
          created_at: string
          date: string
          end_time: string | null
          id: string
          notes: string | null
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      time_entries: {
        Row: {
          case_id: string
          created_at: string
          date: string
          end_time: string
          hours: number
          id: string
          notes: string | null
          start_time: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          date: string
          end_time: string
          hours: number
          id?: string
          notes?: string | null
          start_time: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          date?: string
          end_time?: string
          hours?: number
          id?: string
          notes?: string | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_forms: {
        Row: {
          case_id: string
          comments: string | null
          created_at: string
          form_type: string
          id: string
          items: Json
          signature_url: string | null
          user_id: string
        }
        Insert: {
          case_id: string
          comments?: string | null
          created_at?: string
          form_type: string
          id?: string
          items?: Json
          signature_url?: string | null
          user_id: string
        }
        Update: {
          case_id?: string
          comments?: string | null
          created_at?: string
          form_type?: string
          id?: string
          items?: Json
          signature_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_forms_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_records: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
