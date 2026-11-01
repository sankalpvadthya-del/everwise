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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answered_at: string
          awarded_points: number
          confidence_level: string | null
          evaluation_feedback: string | null
          evaluation_status: string
          id: string
          question_id: string
          response_duration_seconds: number | null
          session_id: string
          submitted_answer: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          awarded_points?: number
          confidence_level?: string | null
          evaluation_feedback?: string | null
          evaluation_status: string
          id?: string
          question_id: string
          response_duration_seconds?: number | null
          session_id: string
          submitted_answer?: string | null
          user_id?: string
        }
        Update: {
          answered_at?: string
          awarded_points?: number
          confidence_level?: string | null
          evaluation_feedback?: string | null
          evaluation_status?: string
          id?: string
          question_id?: string
          response_duration_seconds?: number | null
          session_id?: string
          submitted_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_observations: {
        Row: {
          confidence_summary: Json
          elapsed_time_since_study: number
          id: string
          observation_type: string
          observed_at: string
          recall_score: number
          session_id: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          confidence_summary?: Json
          elapsed_time_since_study?: number
          id?: string
          observation_type?: string
          observed_at?: string
          recall_score: number
          session_id?: string | null
          topic_id: string
          user_id?: string
        }
        Update: {
          confidence_summary?: Json
          elapsed_time_since_study?: number
          id?: string
          observation_type?: string
          observed_at?: string
          recall_score?: number
          session_id?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_observations_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          created_at: string
          daily_study_goal: number
          display_name: string | null
          id: string
          learning_goals: string | null
          preferences: Json
          subjects: string[]
          updated_at: string
        }
        Insert: {
          academic_level?: string | null
          created_at?: string
          daily_study_goal?: number
          display_name?: string | null
          id: string
          learning_goals?: string | null
          preferences?: Json
          subjects?: string[]
          updated_at?: string
        }
        Update: {
          academic_level?: string | null
          created_at?: string
          daily_study_goal?: number
          display_name?: string | null
          id?: string
          learning_goals?: string | null
          preferences?: Json
          subjects?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          concept_tag: string | null
          created_at: string
          difficulty: string
          expected_answer: string
          explanation: string | null
          id: string
          options: Json | null
          question_text: string
          question_type: string
          source_reference: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          concept_tag?: string | null
          created_at?: string
          difficulty: string
          expected_answer: string
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text: string
          question_type: string
          source_reference?: string | null
          topic_id: string
          user_id?: string
        }
        Update: {
          concept_tag?: string | null
          created_at?: string
          difficulty?: string
          expected_answer?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
          source_reference?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_history: {
        Row: {
          completed_at: string
          id: string
          outcome_summary: string | null
          revision_task_id: string | null
          session_id: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          outcome_summary?: string | null
          revision_task_id?: string | null
          session_id?: string | null
          topic_id: string
          user_id?: string
        }
        Update: {
          completed_at?: string
          id?: string
          outcome_summary?: string | null
          revision_task_id?: string | null
          session_id?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_history_revision_task_id_fkey"
            columns: ["revision_task_id"]
            isOneToOne: false
            referencedRelation: "revision_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_history_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_manual: boolean
          planned_duration_minutes: number
          planned_for: string
          reason: string | null
          session_id: string | null
          status: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_manual?: boolean
          planned_duration_minutes?: number
          planned_for: string
          reason?: string | null
          session_id?: string | null
          status?: string
          topic_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_manual?: boolean
          planned_duration_minutes?: number
          planned_for?: string
          reason?: string | null
          session_id?: string | null
          status?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          id: string
          maximum_score: number | null
          question_ids: string[]
          score: number | null
          session_type: string
          started_at: string
          status: string
          topic_id: string
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          maximum_score?: number | null
          question_ids?: string[]
          score?: number | null
          session_type?: string
          started_at?: string
          status?: string
          topic_id: string
          total_questions?: number
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          maximum_score?: number | null
          question_ids?: string[]
          score?: number | null
          session_type?: string
          started_at?: string
          status?: string
          topic_id?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          exam_date: string | null
          explanation: Json | null
          id: string
          source_metadata: Json
          source_text: string | null
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exam_date?: string | null
          explanation?: Json | null
          id?: string
          source_metadata?: Json
          source_text?: string | null
          subject?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exam_date?: string | null
          explanation?: Json | null
          id?: string
          source_metadata?: Json
          source_text?: string | null
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weak_spots: {
        Row: {
          concept_tag: string
          diagnostic_category: string
          evidence_summary: string | null
          id: string
          last_observed_at: string
          occurrence_count: number
          status: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_tag: string
          diagnostic_category?: string
          evidence_summary?: string | null
          id?: string
          last_observed_at?: string
          occurrence_count?: number
          status?: string
          topic_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          concept_tag?: string
          diagnostic_category?: string
          evidence_summary?: string | null
          id?: string
          last_observed_at?: string
          occurrence_count?: number
          status?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weak_spots_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finish_recall_session: { Args: { p_session_id: string }; Returns: string }
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
