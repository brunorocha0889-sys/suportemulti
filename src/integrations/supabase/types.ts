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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chamados: {
        Row: {
          created_at: string
          descricao: string
          id: string
          motivo_pausa: string | null
          numero_os: string | null
          pausado_em: string | null
          setor_destino: string
          sla_vencimento: string | null
          solicitante_nome: string
          solicitante_ramal: string | null
          solicitante_setor: string
          status: Database["public"]["Enums"]["chamado_status"]
          tempo_pausado_minutos: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          motivo_pausa?: string | null
          numero_os?: string | null
          pausado_em?: string | null
          setor_destino: string
          sla_vencimento?: string | null
          solicitante_nome: string
          solicitante_ramal?: string | null
          solicitante_setor: string
          status?: Database["public"]["Enums"]["chamado_status"]
          tempo_pausado_minutos?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          motivo_pausa?: string | null
          numero_os?: string | null
          pausado_em?: string | null
          setor_destino?: string
          sla_vencimento?: string | null
          solicitante_nome?: string
          solicitante_ramal?: string | null
          solicitante_setor?: string
          status?: Database["public"]["Enums"]["chamado_status"]
          tempo_pausado_minutos?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamados_setor_fk"
            columns: ["setor_destino"]
            isOneToOne: false
            referencedRelation: "setores_receptores"
            referencedColumns: ["slug"]
          },
        ]
      }
      os_counter: {
        Row: {
          ano: number
          ultimo: number
        }
        Insert: {
          ano: number
          ultimo?: number
        }
        Update: {
          ano?: number
          ultimo?: number
        }
        Relationships: []
      }
      perfis: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          setor: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          setor: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          setor?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_setor_fk"
            columns: ["setor"]
            isOneToOne: false
            referencedRelation: "setores_receptores"
            referencedColumns: ["slug"]
          },
        ]
      }
      setores_receptores: {
        Row: {
          ativo: boolean
          cor_fg_hex: string
          cor_hex: string
          created_at: string
          nome: string
          slug: string
        }
        Insert: {
          ativo?: boolean
          cor_fg_hex?: string
          cor_hex?: string
          created_at?: string
          nome: string
          slug: string
        }
        Update: {
          ativo?: boolean
          cor_fg_hex?: string
          cor_hex?: string
          created_at?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      setores_solicitantes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          setor_destino: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          setor_destino: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          setor_destino?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_solicitantes_setor_fk"
            columns: ["setor_destino"]
            isOneToOne: false
            referencedRelation: "setores_receptores"
            referencedColumns: ["slug"]
          },
        ]
      }
      sla_config: {
        Row: {
          horas_resolucao: number
          horas_resposta: number
          setor: string
          updated_at: string
        }
        Insert: {
          horas_resolucao?: number
          horas_resposta?: number
          setor: string
          updated_at?: string
        }
        Update: {
          horas_resolucao?: number
          horas_resposta?: number
          setor?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_config_setor_fk"
            columns: ["setor"]
            isOneToOne: true
            referencedRelation: "setores_receptores"
            referencedColumns: ["slug"]
          },
        ]
      }
      solucoes_chamados: {
        Row: {
          admin_id: string
          chamado_id: string
          data_resolucao: string
          descricao_solucao: string
          id: string
          tempo_gasto_minutos: number
        }
        Insert: {
          admin_id: string
          chamado_id: string
          data_resolucao?: string
          descricao_solucao: string
          id?: string
          tempo_gasto_minutos?: number
        }
        Update: {
          admin_id?: string
          chamado_id?: string
          data_resolucao?: string
          descricao_solucao?: string
          id?: string
          tempo_gasto_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "solucoes_chamados_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_chamado_por_os: {
        Args: { p_numero: string }
        Returns: {
          created_at: string
          data_resolucao: string
          descricao: string
          numero_os: string
          setor_destino: string
          sla_vencimento: string
          solicitante_nome: string
          solicitante_setor: string
          solucao: string
          status: Database["public"]["Enums"]["chamado_status"]
          tempo_gasto_minutos: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_setor: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      chamado_status:
        | "aberto"
        | "em_andamento"
        | "finalizado"
        | "atrasado"
        | "em_espera"
      user_role: "admin" | "secundario" | "usuario"
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
      chamado_status: [
        "aberto",
        "em_andamento",
        "finalizado",
        "atrasado",
        "em_espera",
      ],
      user_role: ["admin", "secundario", "usuario"],
    },
  },
} as const
